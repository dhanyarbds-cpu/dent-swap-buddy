import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(
      token
    );
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { listing_id, amount, delivery_method, shipping_address } =
      await req.json();
    if (!listing_id || !amount) {
      return new Response(
        JSON.stringify({ error: "listing_id and amount required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch listing
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, title, price, seller_id, status, images")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (listing.seller_id === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot buy your own listing" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (listing.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Listing is no longer available" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get seller's Stripe account
    const { data: sellerProfile } = await serviceSupabase
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", listing.seller_id)
      .single();

    if (!sellerProfile?.stripe_account_id) {
      return new Response(
        JSON.stringify({
          error:
            "Seller has not set up payment receiving. Please contact the seller.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch commission settings
    const { data: settings } = await serviceSupabase
      .from("platform_settings")
      .select("value")
      .eq("key", "commission")
      .single();

    const commissionRate = settings?.value?.rate ?? 1;
    const buyerFeeRate = settings?.value?.buyer_fee_rate ?? 1;

    const commissionAmount =
      Math.round((amount * commissionRate) / 100 * 100) / 100;
    const buyerServiceFee =
      Math.round((amount * buyerFeeRate) / 100 * 100) / 100;
    const sellerPayout = Math.round((amount - commissionAmount) * 100) / 100;
    const totalBuyerPayment =
      Math.round((amount + buyerServiceFee) * 100) / 100;

    // Platform keeps: commission from seller + buyer service fee
    const platformFee = Math.round((commissionAmount + buyerServiceFee) * 100); // in paise
    const totalAmountPaise = Math.round(totalBuyerPayment * 100);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if buyer already has a Stripe customer
    const customers = await stripe.customers.list({
      email: user.email!,
      limit: 1,
    });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") ||
      "https://dent-swap-buddy.lovable.app";

    // Create order record first
    const { data: order, error: orderError } = await serviceSupabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        seller_id: listing.seller_id,
        listing_id,
        price: amount,
        status: "pending",
        payment_method: "stripe",
        escrow_status: "pending",
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        seller_payout: sellerPayout,
        buyer_service_fee: buyerServiceFee,
        delivery_method: delivery_method || "pickup",
        shipping_address: shipping_address || null,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Order insert error:", orderError);
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Stripe Checkout session with Connect
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: listing.title,
              images: listing.images?.length ? [listing.images[0]] : [],
            },
            unit_amount: totalAmountPaise,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: sellerProfile.stripe_account_id,
        },
        metadata: {
          order_id: order.id,
          listing_id,
          buyer_id: user.id,
          seller_id: listing.seller_id,
        },
      },
      success_url: `${origin}/orders?payment=success&order_id=${order.id}`,
      cancel_url: `${origin}/orders?payment=cancelled&order_id=${order.id}`,
      metadata: {
        order_id: order.id,
        listing_id,
      },
    });

    // Store Stripe session ID on the order
    await serviceSupabase
      .from("orders")
      .update({ razorpay_order_id: session.id })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        url: session.url,
        order_id: order.id,
        session_id: session.id,
        product_price: amount,
        commission_amount: commissionAmount,
        buyer_service_fee: buyerServiceFee,
        seller_payout: sellerPayout,
        total_payment: totalBuyerPayment,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("create-stripe-checkout error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

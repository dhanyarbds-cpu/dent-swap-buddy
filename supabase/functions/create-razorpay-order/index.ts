import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const { listing_id, amount, delivery_method, shipping_address } = await req.json();
    if (!listing_id || !amount) {
      return new Response(JSON.stringify({ error: "listing_id and amount required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch listing
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, title, price, seller_id, status")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (listing.seller_id === userId) {
      return new Response(JSON.stringify({ error: "Cannot buy your own listing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (listing.status !== "active") {
      return new Response(JSON.stringify({ error: "Listing is no longer available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch commission settings
    const { data: settings } = await serviceSupabase
      .from("platform_settings")
      .select("value")
      .eq("key", "commission")
      .single();

    const commissionRate = settings?.value?.rate ?? 1;
    const buyerFeeRate = settings?.value?.buyer_fee_rate ?? 1;

    const commissionAmount = Math.round((amount * commissionRate) / 100 * 100) / 100;
    const buyerServiceFee = Math.round((amount * buyerFeeRate) / 100 * 100) / 100;
    const sellerPayout = Math.round((amount - commissionAmount) * 100) / 100;
    const totalBuyerPayment = Math.round((amount + buyerServiceFee) * 100) / 100;
    const totalAmountPaise = Math.round(totalBuyerPayment * 100);

    // Create Razorpay order
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(JSON.stringify({ error: "Razorpay not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      },
      body: JSON.stringify({
        amount: totalAmountPaise,
        currency: "INR",
        receipt: `order_${Date.now()}`,
        notes: {
          listing_id,
          buyer_id: userId,
          seller_id: listing.seller_id,
        },
      }),
    });

    if (!razorpayRes.ok) {
      const errBody = await razorpayRes.text();
      console.error("Razorpay order creation failed:", errBody);
      return new Response(JSON.stringify({ error: "Failed to create Razorpay order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const razorpayOrder = await razorpayRes.json();

    // Create order record
    const { data: order, error: orderError } = await serviceSupabase
      .from("orders")
      .insert({
        buyer_id: userId,
        seller_id: listing.seller_id,
        listing_id,
        price: amount,
        status: "pending",
        payment_method: "razorpay",
        escrow_status: "pending",
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        seller_payout: sellerPayout,
        buyer_service_fee: buyerServiceFee,
        razorpay_order_id: razorpayOrder.id,
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

    // Get buyer profile for prefill
    const { data: buyerProfile } = await serviceSupabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", userId)
      .single();

    return new Response(JSON.stringify({
      razorpay_order_id: razorpayOrder.id,
      razorpay_key_id: razorpayKeyId,
      order_id: order.id,
      amount: totalAmountPaise,
      currency: "INR",
      name: listing.title,
      prefill: {
        name: buyerProfile?.full_name || "",
        email: userEmail || "",
        contact: buyerProfile?.phone || "",
      },
      total_payment: totalBuyerPayment,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-razorpay-order error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

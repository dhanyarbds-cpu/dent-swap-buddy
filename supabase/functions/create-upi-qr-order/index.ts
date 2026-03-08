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

    // Get platform UPI ID from settings or env
    const { data: upiSettings } = await serviceSupabase
      .from("platform_settings")
      .select("value")
      .eq("key", "platform_upi")
      .single();

    const platformUpiId = (upiSettings?.value as any)?.upi_id || "9080970874@upi";
    const platformName = "DentSwap";

    // Create order record
    const { data: order, error: orderError } = await serviceSupabase
      .from("orders")
      .insert({
        buyer_id: userId,
        seller_id: listing.seller_id,
        listing_id,
        price: amount,
        status: "pending_upi_verification",
        payment_method: "upi_qr",
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

    // Build UPI intent URI
    const txnRef = `DSWAP${order.id.replace(/-/g, "").substring(0, 16)}`;
    const upiUri = `upi://pay?pa=${encodeURIComponent(platformUpiId)}&pn=${encodeURIComponent(platformName)}&am=${totalBuyerPayment.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`DentSwap Order ${order.id.substring(0, 8)}`)}&tr=${encodeURIComponent(txnRef)}`;

    return new Response(JSON.stringify({
      order_id: order.id,
      upi_uri: upiUri,
      upi_id: platformUpiId,
      amount: totalBuyerPayment,
      txn_ref: txnRef,
      product_name: listing.title,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-upi-qr-order error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

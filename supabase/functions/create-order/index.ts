import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    const { listing_id, amount } = await req.json();
    if (!listing_id || !amount) {
      return new Response(JSON.stringify({ error: "listing_id and amount required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, title, price, seller_id, status")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (listing.seller_id === userId) {
      return new Response(JSON.stringify({ error: "Cannot buy your own listing" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (listing.status !== "active") {
      return new Response(JSON.stringify({ error: "Listing is no longer available" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create Razorpay order
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const amountInPaise = Math.round(amount * 100);

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: `order_${Date.now()}`,
        notes: {
          listing_id,
          buyer_id: userId,
          seller_id: listing.seller_id,
        },
      }),
    });

    const razorpayOrder = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error("Razorpay error:", razorpayOrder);
      return new Response(JSON.stringify({ error: "Failed to create payment order" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create order record in DB using service role for insert
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: orderError } = await serviceSupabase
      .from("orders")
      .insert({
        buyer_id: userId,
        seller_id: listing.seller_id,
        listing_id,
        price: amount,
        status: "pending",
        razorpay_order_id: razorpayOrder.id,
        escrow_status: "pending",
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Order insert error:", orderError);
      return new Response(JSON.stringify({ error: "Failed to create order" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      razorpay_order_id: razorpayOrder.id,
      razorpay_key_id: RAZORPAY_KEY_ID,
      order_id: order.id,
      amount: amountInPaise,
      currency: "INR",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-order error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

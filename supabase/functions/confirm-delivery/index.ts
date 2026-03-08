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

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Only buyer can confirm delivery (release escrow)
    const { data: order, error: orderError } = await serviceSupabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .eq("buyer_id", userId)
      .eq("escrow_status", "held")
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found or not eligible for release" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let transferResult = null;

    // If payment was via Razorpay, do Route transfer to seller
    if (order.payment_method === "razorpay" && order.razorpay_payment_id) {
      const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
      const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

      if (razorpayKeyId && razorpayKeySecret) {
        // Get seller's Razorpay linked account
        const { data: payoutDetails } = await serviceSupabase
          .from("seller_payout_details")
          .select("razorpay_account_id")
          .eq("seller_id", order.seller_id)
          .single();

        if (payoutDetails?.razorpay_account_id) {
          // Create transfer via Razorpay Route
          const sellerPayoutPaise = Math.round((order.seller_payout || 0) * 100);

          const transferRes = await fetch(
            `https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/transfers`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
              },
              body: JSON.stringify({
                transfers: [
                  {
                    account: payoutDetails.razorpay_account_id,
                    amount: sellerPayoutPaise,
                    currency: "INR",
                    notes: {
                      order_id: order.id,
                      seller_id: order.seller_id,
                      purpose: "seller_payout",
                    },
                  },
                ],
              }),
            }
          );

          const transferData = await transferRes.json();

          if (!transferRes.ok) {
            console.error("Razorpay Route transfer failed:", JSON.stringify(transferData));
            // Don't block delivery confirmation, but log the failure
            transferResult = { success: false, error: transferData?.error?.description || "Transfer failed" };
          } else {
            transferResult = { success: true, transfer_id: transferData?.items?.[0]?.id };
            console.log("Razorpay Route transfer successful:", transferData?.items?.[0]?.id);
          }
        } else {
          transferResult = { success: false, error: "Seller has no Razorpay linked account" };
          console.warn("Seller has no Razorpay linked account for order:", order_id);
        }
      }
    }

    // Release escrow — update order status
    const { error: updateError } = await serviceSupabase
      .from("orders")
      .update({
        status: "completed",
        escrow_status: "released",
        escrow_released_at: new Date().toISOString(),
      })
      .eq("id", order_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to release escrow" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Escrow released. Payment sent to seller.",
      seller_payout: order.seller_payout,
      commission_amount: order.commission_amount,
      transfer: transferResult,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("confirm-delivery error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    // If webhook secret is configured, verify signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    let event: Stripe.Event;

    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    console.log(`[STRIPE-WEBHOOK] Processing event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;

        if (orderId) {
          // Update order to paid
          await serviceSupabase
            .from("orders")
            .update({
              status: "paid",
              escrow_status: "held",
              razorpay_payment_id: session.payment_intent as string,
            })
            .eq("id", orderId);

          // Mark listing as sold
          const { data: order } = await serviceSupabase
            .from("orders")
            .select("listing_id, buyer_id, seller_id")
            .eq("id", orderId)
            .single();

          if (order?.listing_id) {
            await serviceSupabase
              .from("listings")
              .update({ status: "sold" })
              .eq("id", order.listing_id);
          }

          // Notify buyer
          if (order?.buyer_id) {
            await serviceSupabase.from("notifications").insert({
              user_id: order.buyer_id,
              title: "Payment Successful ✓",
              message: "Your payment has been confirmed. The seller will arrange delivery.",
              type: "payment",
              data: { order_id: orderId },
            });
          }

          // Notify seller
          if (order?.seller_id) {
            await serviceSupabase.from("notifications").insert({
              user_id: order.seller_id,
              title: "New Order Received! 🎉",
              message: "A buyer has purchased your listing. Please arrange delivery.",
              type: "order",
              data: { order_id: orderId },
            });
          }

          console.log(`[STRIPE-WEBHOOK] Order ${orderId} marked as paid`);
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const userId = account.metadata?.user_id;

        if (userId && account.charges_enabled) {
          await serviceSupabase
            .from("profiles")
            .update({ stripe_onboarding_complete: true })
            .eq("user_id", userId);
          console.log(`[STRIPE-WEBHOOK] Seller ${userId} onboarding complete`);
        }
        break;
      }

      default:
        console.log(`[STRIPE-WEBHOOK] Unhandled event: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stripe-webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

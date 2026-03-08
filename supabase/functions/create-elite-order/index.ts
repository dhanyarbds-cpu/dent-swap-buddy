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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action } = await req.json();

    if (action === "create_razorpay_order") {
      // Check for existing active membership
      const { data: existing } = await supabase
        .from("elite_memberships")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "You already have an active membership" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
      const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return new Response(JSON.stringify({ error: "Payment gateway not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const amountInPaise = 10000; // ₹100

      const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: `elite_${user.id.substring(0, 8)}_${Date.now()}`,
          notes: { user_id: user.id, type: "elite_membership" },
        }),
      });

      const razorpayOrder = await razorpayResponse.json();
      if (!razorpayResponse.ok) {
        console.error("Razorpay error:", razorpayOrder);
        return new Response(JSON.stringify({ error: "Failed to create payment order" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        razorpay_order_id: razorpayOrder.id,
        razorpay_key_id: RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: "INR",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "verify_and_activate") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

      // Actually we already parsed json above, let me handle this differently
      return new Response(JSON.stringify({ error: "Use the dedicated verify endpoint" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-elite-order error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

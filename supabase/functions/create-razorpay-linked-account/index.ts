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

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(JSON.stringify({ error: "Razorpay not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get seller's payout details
    const { data: payoutDetails, error: payoutError } = await serviceSupabase
      .from("seller_payout_details")
      .select("*")
      .eq("seller_id", userId)
      .single();

    if (payoutError || !payoutDetails) {
      return new Response(JSON.stringify({ error: "Please save your payout details first" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already has a linked account, return it
    if (payoutDetails.razorpay_account_id) {
      return new Response(JSON.stringify({
        success: true,
        account_id: payoutDetails.razorpay_account_id,
        already_exists: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get seller profile for name
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", userId)
      .single();

    const sellerName = profile?.full_name || "Seller";
    const sellerPhone = profile?.phone || null;

    // Build Razorpay linked account (Route) payload
    // Using Razorpay Route API to create a linked account
    const accountPayload: Record<string, unknown> = {
      email: userEmail,
      phone: sellerPhone ? sellerPhone.replace(/\D/g, "").slice(-10) : undefined,
      type: "route",
      legal_business_name: sellerName,
      business_type: "individual",
      legal_info: {
        pan: "XXXXX0000X", // placeholder - in production, collect real PAN
      },
      profile: {
        category: "ecommerce",
        subcategory: "ecommerce_marketplace",
        addresses: {
          registered: {
            street1: "N/A",
            street2: "N/A",
            city: "N/A",
            state: "N/A",
            postal_code: 100000,
            country: "IN",
          },
        },
      },
    };

    // Try creating a linked account via Razorpay's Account API v2
    const razorpayRes = await fetch("https://api.razorpay.com/v2/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      },
      body: JSON.stringify(accountPayload),
    });

    const razorpayData = await razorpayRes.json();

    if (!razorpayRes.ok) {
      console.error("Razorpay linked account creation failed:", JSON.stringify(razorpayData));
      return new Response(JSON.stringify({
        error: "Failed to create Razorpay linked account",
        details: razorpayData?.error?.description || "Unknown error",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = razorpayData.id;

    // Save linked account ID
    await serviceSupabase
      .from("seller_payout_details")
      .update({ razorpay_account_id: accountId })
      .eq("seller_id", userId);

    return new Response(JSON.stringify({
      success: true,
      account_id: accountId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-razorpay-linked-account error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

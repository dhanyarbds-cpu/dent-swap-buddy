import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256(message: string): Promise<string> {
  const enc = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

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

    const { listing_id } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: "listing_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify listing belongs to user
    const { data: listing, error: listingError } = await serviceSupabase
      .from("listings")
      .select("id, title, brand, condition, seller_id, created_at")
      .eq("id", listing_id)
      .eq("seller_id", userId)
      .single();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found or not yours" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if cert already exists
    const { data: existing } = await serviceSupabase
      .from("product_certificates")
      .select("id")
      .eq("listing_id", listing_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Certificate already exists for this listing" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get seller profile
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single();

    // Get previous hash for chain
    const { data: lastCert } = await serviceSupabase
      .from("product_certificates")
      .select("certificate_hash")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousHash = lastCert?.certificate_hash || "GENESIS";
    const issuedAt = new Date().toISOString();

    // Create tamper-proof hash
    const hashPayload = JSON.stringify({
      listing_id,
      product_name: listing.title,
      brand: listing.brand,
      condition: listing.condition,
      seller_id: userId,
      seller_name: profile?.full_name || "",
      issued_at: issuedAt,
      previous_hash: previousHash,
    });

    const certificateHash = await sha256(hashPayload);

    // Insert certificate
    const { data: cert, error: insertError } = await serviceSupabase
      .from("product_certificates")
      .insert({
        listing_id,
        seller_id: userId,
        certificate_hash: certificateHash,
        previous_hash: previousHash,
        product_name: listing.title,
        brand: listing.brand,
        condition: listing.condition,
        seller_name: profile?.full_name || "",
        issued_at: issuedAt,
        metadata: { listing_created_at: listing.created_at },
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Certificate insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to generate certificate" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create notification for seller
    await serviceSupabase.from("notifications").insert({
      user_id: userId,
      type: "certificate",
      title: "Certificate Issued",
      message: `Authenticity certificate generated for "${listing.title}"`,
      data: { certificate_id: cert.id, listing_id },
    });

    return new Response(JSON.stringify({
      success: true,
      certificate_id: cert.id,
      certificate_hash: certificateHash,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-certificate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

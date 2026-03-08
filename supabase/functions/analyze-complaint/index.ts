import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { seller_id } = await req.json();
    if (!seller_id) throw new Error("seller_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all complaints against this seller
    const { data: complaints } = await supabase
      .from("complaints")
      .select("id, category, status, created_at")
      .eq("seller_id", seller_id);

    const totalComplaints = complaints?.length || 0;
    const openComplaints = complaints?.filter((c: any) => c.status === "open").length || 0;
    const resolvedComplaints = complaints?.filter((c: any) => c.status === "resolved").length || 0;

    // Fetch seller reviews for average rating
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("reviewed_user_id", seller_id);

    const avgRating = reviews && reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 5;

    // Calculate trust score
    // Start at 100, deduct for complaints, boost for good ratings and resolutions
    let trustScore = 100;
    trustScore -= totalComplaints * 8; // each complaint costs 8 points
    trustScore += resolvedComplaints * 3; // resolved complaints recover 3 points
    trustScore -= openComplaints * 5; // extra penalty for unresolved
    trustScore += (avgRating - 3) * 5; // rating adjustment (-10 to +10)
    trustScore = Math.max(0, Math.min(100, trustScore));

    // Determine action
    let actionTaken = "none";
    let warningLevel = 0;

    // Fetch existing warnings
    const { data: warnings } = await supabase
      .from("seller_warnings")
      .select("id, warning_level")
      .eq("seller_id", seller_id)
      .order("created_at", { ascending: false });

    const existingWarnings = warnings?.length || 0;

    if (trustScore < 30 || totalComplaints >= 5) {
      // BLOCK seller
      actionTaken = "blocked";
      warningLevel = 3;

      await supabase
        .from("profiles")
        .update({ is_blocked: true, blocked_reason: "Repeated violations and low trust score" })
        .eq("user_id", seller_id);

      // Deactivate all listings
      await supabase
        .from("listings")
        .update({ status: "blocked" })
        .eq("seller_id", seller_id);

    } else if (trustScore < 50 || totalComplaints >= 3) {
      // Restrict
      actionTaken = "restricted";
      warningLevel = 2;
    } else if (totalComplaints >= 1 && existingWarnings === 0) {
      // First warning
      actionTaken = "warning";
      warningLevel = 1;
    }

    // Upsert trust score
    const { data: existing } = await supabase
      .from("seller_trust_scores")
      .select("id")
      .eq("seller_id", seller_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("seller_trust_scores")
        .update({
          trust_score: trustScore,
          total_complaints: totalComplaints,
          resolved_complaints: resolvedComplaints,
          unresolved_complaints: openComplaints,
          is_blocked: actionTaken === "blocked",
          blocked_at: actionTaken === "blocked" ? new Date().toISOString() : null,
          block_reason: actionTaken === "blocked" ? "Auto-blocked due to repeated violations" : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("seller_trust_scores").insert({
        seller_id,
        trust_score: trustScore,
        total_complaints: totalComplaints,
        resolved_complaints: resolvedComplaints,
        unresolved_complaints: openComplaints,
        is_blocked: actionTaken === "blocked",
        blocked_at: actionTaken === "blocked" ? new Date().toISOString() : null,
        block_reason: actionTaken === "blocked" ? "Auto-blocked due to repeated violations" : null,
      });
    }

    // Record warning if action was taken
    if (actionTaken !== "none") {
      const latestComplaint = complaints?.[complaints.length - 1];
      await supabase.from("seller_warnings").insert({
        seller_id,
        complaint_id: latestComplaint?.id || null,
        warning_level: warningLevel,
        reason: `Trust score: ${Math.round(trustScore)}. Total complaints: ${totalComplaints}.`,
        action_taken: actionTaken,
      });
    }

    // --- Buyer trust tracking ---
    // Check if the buyer who filed this complaint has excessive complaint history
    const { data: buyerComplaints } = await supabase
      .from("complaints")
      .select("id, status")
      .eq("buyer_id", seller_id); // Note: we check all buyers who complained about this seller

    // For each unique buyer, update their trust score
    const { data: allBuyerComplaints } = await supabase
      .from("complaints")
      .select("buyer_id, status")
      .eq("seller_id", seller_id);

    const buyerIds = [...new Set((allBuyerComplaints || []).map((c: any) => c.buyer_id))];
    
    for (const buyerId of buyerIds) {
      const { data: buyerAllComplaints } = await supabase
        .from("complaints")
        .select("id, status")
        .eq("buyer_id", buyerId);

      const buyerTotal = buyerAllComplaints?.length || 0;
      const buyerFalse = buyerAllComplaints?.filter((c: any) => c.status === "rejected").length || 0;
      
      let buyerScore = 100 - (buyerFalse * 15) - (buyerTotal > 5 ? (buyerTotal - 5) * 3 : 0);
      buyerScore = Math.max(0, Math.min(100, buyerScore));

      const { data: existingBuyer } = await supabase
        .from("buyer_trust_scores")
        .select("id")
        .eq("buyer_id", buyerId)
        .maybeSingle();

      if (existingBuyer) {
        await supabase.from("buyer_trust_scores").update({
          trust_score: buyerScore,
          total_complaints: buyerTotal,
          false_complaints: buyerFalse,
          is_restricted: buyerScore < 30,
          restricted_at: buyerScore < 30 ? new Date().toISOString() : null,
          restrict_reason: buyerScore < 30 ? "Excessive false complaints" : null,
          updated_at: new Date().toISOString(),
        }).eq("id", existingBuyer.id);
      } else {
        await supabase.from("buyer_trust_scores").insert({
          buyer_id: buyerId,
          trust_score: buyerScore,
          total_complaints: buyerTotal,
          false_complaints: buyerFalse,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, trust_score: trustScore, action: actionTaken }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid token");

    const { action } = await req.json();

    if (action === "activate") {
      // Check for existing active membership
      const { data: existing } = await supabase
        .from("elite_memberships")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({
          success: true,
          message: "Membership already active",
          membership: existing,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Create new membership
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data: membership, error: insertError } = await supabase
        .from("elite_memberships")
        .insert({
          user_id: user.id,
          status: "active",
          amount: 100,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update profile to elite
      await supabase
        .from("profiles")
        .update({ is_elite: true })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({
        success: true,
        message: "Elite Membership activated!",
        membership,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "check_status") {
      const { data: membership } = await supabase
        .from("elite_memberships")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (membership && new Date(membership.expires_at) < new Date()) {
        // Expired — deactivate
        await supabase
          .from("elite_memberships")
          .update({ status: "expired" })
          .eq("id", membership.id);
        await supabase
          .from("profiles")
          .update({ is_elite: false })
          .eq("user_id", user.id);

        return new Response(JSON.stringify({
          active: false,
          expired: true,
          membership,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const daysLeft = membership
        ? Math.ceil((new Date(membership.expires_at).getTime() - Date.now()) / 86400000)
        : 0;

      return new Response(JSON.stringify({
        active: !!membership,
        membership,
        daysLeft,
        expiringSoon: daysLeft > 0 && daysLeft <= 3,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Invalid action");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

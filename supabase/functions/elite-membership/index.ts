import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    if (authError || !user) throw new Error("Invalid token");

    const { action } = await req.json();

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

    throw new Error("Invalid action. Use 'check_status' only. Membership activation requires payment via create-elite-order and verify-elite-payment.");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

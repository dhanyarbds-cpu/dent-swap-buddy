import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { listing_id } = await req.json();
    const authHeader = req.headers.get("Authorization");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch listing
    const { data: listing } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .eq("seller_id", user.id)
      .single();
    if (!listing) throw new Error("Listing not found");

    // Fetch similar listings for market comparison
    const { data: similar } = await supabase
      .from("listings")
      .select("price, condition, created_at, status")
      .eq("category", listing.category)
      .eq("status", "active")
      .neq("id", listing_id)
      .limit(20);

    const similarPrices = (similar || []).map((s: any) => s.price);
    const avgPrice = similarPrices.length > 0 ? similarPrices.reduce((a: number, b: number) => a + b, 0) / similarPrices.length : listing.price;
    const minPrice = similarPrices.length > 0 ? Math.min(...similarPrices) : listing.price * 0.7;
    const maxPrice = similarPrices.length > 0 ? Math.max(...similarPrices) : listing.price * 1.3;

    // Fetch views/interest
    const { count: viewCount } = await supabase
      .from("product_analytics")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listing_id);

    const { count: chatCount } = await supabase
      .from("chat_requests")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listing_id);

    // Use AI for pricing recommendation
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    const prompt = `You are a pricing expert for a medical/dental student marketplace. Analyze this listing and suggest an optimal price.

Listing: "${listing.title}" - ${listing.brand}, ${listing.condition} condition
Current price: ₹${listing.price}
Category: ${listing.category}
Location: ${listing.location}
Days listed: ${Math.floor((Date.now() - new Date(listing.created_at).getTime()) / 86400000)}
Views: ${viewCount || 0}, Chat inquiries: ${chatCount || 0}
Market data: Average price ₹${Math.round(avgPrice)}, Range ₹${Math.round(minPrice)}-₹${Math.round(maxPrice)} (${similarPrices.length} similar listings)

Return a JSON with: suggested_price (number), confidence (high/medium/low), reasoning (1 sentence), action (increase/decrease/keep).`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "pricing_recommendation",
            description: "Return pricing recommendation",
            parameters: {
              type: "object",
              properties: {
                suggested_price: { type: "number" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
                reasoning: { type: "string" },
                action: { type: "string", enum: ["increase", "decrease", "keep"] },
              },
              required: ["suggested_price", "confidence", "reasoning", "action"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "pricing_recommendation" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let recommendation = { suggested_price: listing.price, confidence: "medium", reasoning: "Keep current price", action: "keep" };
    
    if (toolCall?.function?.arguments) {
      try {
        recommendation = JSON.parse(toolCall.function.arguments);
      } catch {}
    }

    return new Response(JSON.stringify({
      success: true,
      recommendation,
      market: { avg: Math.round(avgPrice), min: Math.round(minPrice), max: Math.round(maxPrice), count: similarPrices.length },
      engagement: { views: viewCount || 0, chats: chatCount || 0 },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

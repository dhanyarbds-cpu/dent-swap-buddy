import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, serviceKey);

    const { listing_id } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: "listing_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the new listing
    const { data: listing, error: listingErr } = await supabase
      .from("listings")
      .select("id, title, category, description, hashtags, price")
      .eq("id", listing_id)
      .single();

    if (listingErr || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all active demand alerts from elite users
    const { data: demands } = await supabase
      .from("demand_alerts")
      .select("id, user_id, keywords, category")
      .eq("is_active", true);

    if (!demands || demands.length === 0) {
      return new Response(JSON.stringify({ matched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build listing text for matching
    const listingText = [
      listing.title,
      listing.category,
      listing.description,
      ...(listing.hashtags || []),
    ].join(" ").toLowerCase();

    let matched = 0;

    // Use AI for smart matching if available, otherwise fallback to keyword matching
    if (lovableKey) {
      // Use AI to batch evaluate matches
      const demandTexts = demands.map((d) => `ID:${d.id} Keywords:"${d.keywords}" Category:"${d.category}"`).join("\n");

      const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a product matching assistant. Given a new product listing and a list of user demand requests, determine which demands match the listing. A match means the user would likely want this product based on their search keywords. Consider synonyms, related terms, and category relevance. Return ONLY a JSON array of objects with format: [{"id":"demand_id","score":0.85,"reason":"brief reason"}]. If no matches, return []. Score from 0 to 1, only include matches with score >= 0.4.`,
            },
            {
              role: "user",
              content: `New Listing:\nTitle: "${listing.title}"\nCategory: "${listing.category}"\nDescription: "${listing.description}"\nTags: ${(listing.hashtags || []).join(", ")}\nPrice: ₹${listing.price}\n\nDemand Requests:\n${demandTexts}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "[]";
        
        // Extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const matches = JSON.parse(jsonMatch[0]);
            
            for (const match of matches) {
              const demand = demands.find((d) => d.id === match.id);
              if (!demand) continue;

              // Don't notify seller about their own listing
              if (demand.user_id === listing.seller_id) continue;

              await supabase.rpc("insert_elite_notification", {
                p_user_id: demand.user_id,
                p_demand_alert_id: demand.id,
                p_listing_id: listing.id,
                p_title: "🔔 Product Match Found!",
                p_message: match.reason || `A new listing "${listing.title}" matches your search for "${demand.keywords}"`,
                p_match_score: match.score || 0.5,
              });
              matched++;
            }
          } catch (e) {
            console.error("Failed to parse AI response:", e);
          }
        }
      }
    }
    
    // Fallback: keyword-based matching if AI didn't match or isn't available
    if (matched === 0) {
      for (const demand of demands) {
        const demandWords = demand.keywords.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
        const categoryMatch = demand.category && listing.category.toLowerCase().includes(demand.category.toLowerCase());

        let keywordHits = 0;
        for (const word of demandWords) {
          if (listingText.includes(word)) keywordHits++;
        }

        const score = demandWords.length > 0
          ? (keywordHits / demandWords.length) * (categoryMatch ? 1.2 : 1)
          : categoryMatch ? 0.5 : 0;

        if (score >= 0.4) {
          await supabase.rpc("insert_elite_notification", {
            p_user_id: demand.user_id,
            p_demand_alert_id: demand.id,
            p_listing_id: listing.id,
            p_title: "🔔 Product Match Found!",
            p_message: `A new listing "${listing.title}" matches your search for "${demand.keywords}"`,
            p_match_score: Math.min(score, 1),
          });
          matched++;
        }
      }
    }

    return new Response(JSON.stringify({ matched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Match error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

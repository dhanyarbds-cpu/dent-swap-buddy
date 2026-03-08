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
    const { messages, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Optionally fetch user context for personalized responses
    const authHeader = req.headers.get("Authorization");
    let userContext = "";
    
    if (authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("full_name, is_elite, location, college").eq("user_id", user.id).single();
          const { data: orders } = await supabase.from("orders").select("id, status, price, created_at").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(5);
          const { data: listings } = await supabase.from("listings").select("id, title, price, status").eq("seller_id", user.id).limit(5);
          
          userContext = `\n\nCurrent user context:
- Name: ${profile?.full_name || "Unknown"}
- Elite member: ${profile?.is_elite ? "Yes" : "No"}
- Location: ${profile?.location || "Not set"}
- College: ${profile?.college || "Not set"}
- Recent orders: ${orders?.length ? orders.map((o: any) => `${o.status} (₹${o.price})`).join(", ") : "None"}
- Active listings: ${listings?.length ? listings.map((l: any) => `"${l.title}" ₹${l.price} [${l.status}]`).join(", ") : "None"}`;
        }
      } catch (e) {
        console.error("Context fetch error:", e);
      }
    }

    const langInstruction = language && language !== "en" 
      ? `\n\nIMPORTANT: Respond in ${language === "hi" ? "Hindi" : language === "ta" ? "Tamil" : language === "te" ? "Telugu" : language === "kn" ? "Kannada" : language === "ml" ? "Malayalam" : language === "mr" ? "Marathi" : language === "bn" ? "Bengali" : "English"}. Use the script native to that language. Mix in English for technical/platform terms.`
      : "";

    const systemPrompt = `You are DentSwap AI — an intelligent assistant for a medical/dental/paramedical student marketplace in India. You help with:

**Product queries**: Search advice, availability, pricing insights, and recommendations
**Order tracking**: Status updates, delivery estimates, escalation guidance
**Elite membership**: Benefits, how to subscribe, demand alerts setup
**Negotiation guidance**: Fair pricing tips, how to negotiate effectively
**Safety tips**: Avoiding scams, secure transaction practices
**Platform help**: How to list products, verify profile, manage complaints, use features

Key platform rules:
- Escrow-based payments via Razorpay (1.5-2% commission on sales >₹100)
- Local pickup preferred; courier shipping with tracking available
- Profile verification boosts trust scores
- AI-powered product certificates verify authenticity
- Elite membership costs ₹100/month with priority alerts
- Complaints via My Orders page

If the user's query is about their specific orders/listings, use the context below. If you can't resolve something, suggest contacting human support.

Use markdown formatting: **bold** for emphasis, bullet points for lists, and keep answers concise.${userContext}${langInstruction}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("support-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

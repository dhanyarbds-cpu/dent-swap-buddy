import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { video_url, listing_title } = await req.json();
    if (!video_url) throw new Error("video_url is required");

    // Use Gemini for video analysis (supports video URLs)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a video verification AI for a medical/dental equipment marketplace. Analyze listing videos to ensure authenticity and quality.

APPROVE videos that:
- Clearly show the actual product being sold
- Demonstrate product features, functionality, or condition
- Are original footage (not stock footage or reused content)
- Have reasonable quality (viewer can identify the product)

REJECT videos that:
- Are stock footage or generic promotional videos
- Don't show the actual product
- Contain inappropriate, explicit, or unrelated content
- Show human faces prominently (privacy concern)
- Are extremely low quality or too short to be useful
- Appear reused from other listings or websites

Provide a detailed verification report with:
- Validity score (0-100)
- Issues detected
- Suggestions for improvement

${listing_title ? `The listing is titled: "${listing_title}"` : ""}`
          },
          {
            role: "user",
            content: `Analyze this product listing video for authenticity and quality. Video URL: ${video_url}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "validate_video",
              description: "Return video verification report",
              parameters: {
                type: "object",
                properties: {
                  approved: { type: "boolean", description: "Whether the video is approved" },
                  validity_score: { type: "number", description: "Overall validity score 0-100" },
                  reason: { type: "string", description: "User-friendly summary of the decision" },
                  category: { type: "string", enum: ["authentic", "stock_footage", "unrelated", "inappropriate", "low_quality", "reused"], description: "Classification" },
                  issues_detected: { type: "array", items: { type: "string" }, description: "List of issues found" },
                  suggestions: { type: "array", items: { type: "string" }, description: "Improvement suggestions" },
                  shows_product: { type: "boolean", description: "Whether the video clearly shows the product" },
                  estimated_condition: { type: "string", enum: ["Excellent", "Good", "Fair", "Poor", "Unknown"], description: "Product condition visible in video" }
                },
                required: ["approved", "validity_score", "reason", "category", "issues_detected", "suggestions", "shows_product", "estimated_condition"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "validate_video" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      // Fail open
      return new Response(JSON.stringify({
        approved: true, validity_score: 100, reason: "Validation skipped",
        category: "authentic", issues_detected: [], suggestions: [],
        shows_product: true, estimated_condition: "Unknown"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({
        approved: true, validity_score: 100, reason: "Validation skipped",
        category: "authentic", issues_detected: [], suggestions: [],
        shows_product: true, estimated_condition: "Unknown"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    const approved = result.approved && result.validity_score >= 70;

    return new Response(JSON.stringify({ ...result, approved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("validate-video error:", e);
    return new Response(JSON.stringify({
      approved: true, validity_score: 100, reason: "Validation skipped",
      category: "authentic", issues_detected: [], suggestions: [],
      shows_product: true, estimated_condition: "Unknown"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

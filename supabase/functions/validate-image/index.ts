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

    const { image_url } = await req.json();
    if (!image_url) throw new Error("image_url is required");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are an image moderation AI for a durable medical/dental equipment marketplace. Analyze the image and determine if it's a valid product listing photo.

APPROVE images that show: durable medical equipment, dental instruments, laboratory tools, medical/dental books, clinic furniture, surgical instruments, diagnostic devices, student training equipment, educational models.

REJECT images that show:
- Consumable/disposable products (syringes, gloves, masks, cotton, gauze, disposable kits, chemical reagents, medicines, pharmaceutical products, dental materials used once)
- Human faces or selfies
- Explicit/inappropriate content
- Memes or wallpapers
- Animals
- Random non-product photos
- Extremely blurry/low-quality photos
- Non-healthcare products

IMPORTANT: This platform only allows DURABLE equipment. Consumables and disposable items must be REJECTED.

You must respond using the validate_image tool.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this product listing image. Is it a valid healthcare/medical/dental product photo?" },
              { type: "image_url", image_url: { url: image_url } }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "validate_image",
              description: "Return validation result for the uploaded image",
              parameters: {
                type: "object",
                properties: {
                  approved: { type: "boolean", description: "Whether the image is approved" },
                  confidence: { type: "number", description: "Confidence score 0-100 that this is a valid product image" },
                  reason: { type: "string", description: "Brief reason for the decision, user-friendly" },
                  category: { type: "string", enum: ["product", "human", "inappropriate", "irrelevant", "low_quality"], description: "Category of the image" }
                },
                required: ["approved", "confidence", "reason", "category"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "validate_image" } }
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
      // On AI error, allow the image (fail open) so uploads aren't blocked
      return new Response(JSON.stringify({ approved: true, confidence: 100, reason: "Validation skipped", category: "product" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      // Fail open
      return new Response(JSON.stringify({ approved: true, confidence: 100, reason: "Validation skipped", category: "product" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    // Apply threshold: only approve if confidence >= 80
    const approved = result.approved && result.confidence >= 80;

    return new Response(JSON.stringify({ ...result, approved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("validate-image error:", e);
    // Fail open on errors
    return new Response(JSON.stringify({ approved: true, confidence: 100, reason: "Validation skipped", category: "product" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

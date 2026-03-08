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
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an advanced image verification AI for a medical/dental/paramedical equipment marketplace. Analyze product listing photos with two goals:

1. **MODERATION**: Determine if the image is a valid product listing photo.
2. **CONDITION ASSESSMENT**: If approved, assess the visible condition of the product.

APPROVE images showing: durable medical equipment, dental instruments, laboratory tools, medical/dental books, clinic furniture, surgical instruments, diagnostic devices, student training equipment, educational models.

REJECT images showing:
- Human faces, selfies, or people
- Explicit/inappropriate/obscene content
- Stock images, watermarked photos, screenshots from other listings
- Memes, wallpapers, animals
- Random non-product photos
- Extremely blurry/low-quality photos (can't identify the product)
- Non-healthcare products

For CONDITION ASSESSMENT (only if approved):
- "Excellent": Product looks brand new or barely used, no visible wear
- "Good": Minor signs of use, fully functional appearance
- "Fair": Noticeable wear, scratches, or aging but appears usable
- "Poor": Heavy wear, visible damage, rust, or missing parts

Also flag if the product appears potentially counterfeit (mismatched branding, suspicious packaging).

You must respond using the validate_image tool.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this product listing image for moderation and condition assessment." },
              { type: "image_url", image_url: { url: image_url } }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "validate_image",
              description: "Return validation and condition assessment result",
              parameters: {
                type: "object",
                properties: {
                  approved: { type: "boolean", description: "Whether the image is approved for listing" },
                  confidence: { type: "number", description: "Confidence score 0-100 that this is a valid product image" },
                  reason: { type: "string", description: "Brief user-friendly reason for the decision" },
                  category: { type: "string", enum: ["product", "human", "inappropriate", "irrelevant", "low_quality", "stock_image", "consumable"], description: "Classification of the image. Note: consumable products ARE allowed." },
                  condition_rating: { type: "string", enum: ["Excellent", "Good", "Fair", "Poor", "Unknown"], description: "AI-assessed condition of the product (only meaningful if approved)" },
                  condition_details: { type: "string", description: "Brief description of visible condition aspects (wear, damage, etc.)" },
                  counterfeit_flag: { type: "boolean", description: "True if the product appears potentially counterfeit" },
                  counterfeit_reason: { type: "string", description: "Reason for counterfeit suspicion, if any" },
                  improvement_suggestions: { type: "array", items: { type: "string" }, description: "Suggestions to improve the listing photo (better angle, lighting, etc.)" }
                },
                required: ["approved", "confidence", "reason", "category", "condition_rating", "condition_details", "counterfeit_flag"],
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
      return new Response(JSON.stringify({ approved: true, confidence: 100, reason: "Validation skipped", category: "product", condition_rating: "Unknown", condition_details: "", counterfeit_flag: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ approved: true, confidence: 100, reason: "Validation skipped", category: "product", condition_rating: "Unknown", condition_details: "", counterfeit_flag: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    const approved = result.approved && result.confidence >= 80;

    // Flag borderline cases (approved but low confidence or counterfeit suspicion)
    const needs_admin_review = (approved && result.confidence < 90) || result.counterfeit_flag;

    return new Response(JSON.stringify({ ...result, approved, needs_admin_review }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("validate-image error:", e);
    return new Response(JSON.stringify({ approved: true, confidence: 100, reason: "Validation skipped", category: "product", condition_rating: "Unknown", condition_details: "", counterfeit_flag: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

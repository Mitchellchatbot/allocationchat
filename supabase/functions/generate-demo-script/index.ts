import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK = [
  "Hi, I'm a cardiologist looking at new opportunities",
  "I trained in the UK and I'm open to relocating",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ lines: FALLBACK }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        system: `You generate realistic demo visitor messages for a doctor recruitment chat widget. Return exactly 2 short messages. The first introduces the doctor with a first name and their medical specialty. The second briefly mentions their training background or what they're looking for. Keep each under 15 words. Be natural and varied - different names, specialties, and training countries each time. Examples of specialties: Cardiology, Radiology, General Practice, Emergency Medicine, Orthopaedic Surgery, Paediatrics, Psychiatry, Anaesthetics. Examples of training countries: UK, Australia, South Africa, Canada, New Zealand, USA.`,
        messages: [{ role: "user", content: "Generate 2 demo visitor messages." }],
        tools: [
          {
            name: "return_demo_lines",
            description: "Return demo visitor chat lines",
            input_schema: {
              type: "object",
              properties: {
                lines: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 },
              },
              required: ["lines"],
              additionalProperties: false,
            },
          },
        ],
        tool_choice: { type: "tool", name: "return_demo_lines" },
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ lines: FALLBACK }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolUse = data.content?.find((b: { type: string }) => b.type === "tool_use");
    if (toolUse && Array.isArray(toolUse.input?.lines) && toolUse.input.lines.length >= 2) {
      return new Response(JSON.stringify({ lines: toolUse.input.lines.slice(0, 2) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ lines: FALLBACK }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-demo-script error:", e);
    return new Response(JSON.stringify({ lines: FALLBACK }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

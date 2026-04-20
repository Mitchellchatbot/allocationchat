import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK = [
  "Hi, my name is Sarah",
  "My brother has been struggling with alcohol and we're not sure where to start",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ lines: FALLBACK }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You generate realistic demo visitor messages for a substance abuse treatment center chat widget. Return exactly 2 short messages. The first introduces themselves with a first name. The second briefly describes a loved one's struggle with a substance. Keep each under 15 words. Be natural and varied - different names, substances, relationships, and situations each time. Examples of substances: alcohol, opioids, pills, heroin, meth, cocaine, fentanyl. Examples of relationships: brother, sister, son, daughter, husband, wife, mom, dad, friend.`,
          },
          { role: "user", content: "Generate 2 demo visitor messages." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_demo_lines",
              description: "Return demo visitor chat lines",
              parameters: {
                type: "object",
                properties: {
                  lines: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 2,
                  },
                },
                required: ["lines"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_demo_lines" } },
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ lines: FALLBACK }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      if (Array.isArray(args.lines) && args.lines.length >= 2) {
        return new Response(JSON.stringify({ lines: args.lines.slice(0, 2) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

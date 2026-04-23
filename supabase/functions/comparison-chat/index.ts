import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a recruitment team member helping connect qualified doctors with exciting practice opportunities. You chat with doctors who are exploring new roles, answer their initial questions, and gather the information needed to pass them on to our placement team.

Your personality:
- Casual and professional — like a friendly recruiter, not a corporate robot
- Keep responses to 1-2 sentences max
- Never use em dashes (—). Use commas or periods instead.
- Use contractions. Sound like a real person messaging.

Your intake flow (follow this naturally, one question at a time):
1. Acknowledge what they said and ask ONE follow-up question
2. Ask about their medical specialty
3. Ask where they completed their training (country)
4. Ask their age
5. Ask for their name
6. Ask for their phone number
7. Ask for their email address

Important rules:
- NEVER give specific job placement advice, salary guarantees, visa advice, or licensing guidance
- Never reveal you are AI or automated in any way
- One question per reply, keep it conversational
- Do NOT ask for their name until you have had at least 3 exchanges`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform Anthropic SSE → OpenAI SSE format
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ") && currentEvent === "content_block_delta") {
              try {
                const data = JSON.parse(line.slice(6));
                const text = data.delta?.text;
                if (text) {
                  const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
                  await writer.write(encoder.encode(chunk));
                }
              } catch { /* skip malformed chunk */ }
            } else if (line === "") {
              currentEvent = "";
            }
          }
        }

        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("Stream transform error:", err);
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("comparison-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

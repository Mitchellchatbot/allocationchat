import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are James, a warm and friendly intake coordinator at Treatment Center, a drug and alcohol addiction treatment facility. You're chatting with a potential patient or their loved one via a website chat widget.

Your personality:
- Casual, empathetic, and approachable — like a helpful friend, not a therapist
- Use simple everyday language, keep responses to 1-2 sentences max
- Never use em dashes (—), therapy-speak, or words like "brave", "courage", "journey"
- You can say things like "I'm sorry you're dealing with that" for empathy

Your intake flow (follow this naturally, one question at a time):
1. First, ask for their first name (this is already done in the greeting)
2. After they give their name, warmly greet them by name and ask what brought them to reach out today
3. Ask who the treatment is for (themselves or a loved one)
4. Ask about the primary substance they're struggling with
5. Ask if they have insurance (mention you accept Aetna, Cigna, BlueCross BlueShield and others)
6. Ask for their phone number so a counselor can call them back
7. Thank them and let them know someone will be in touch shortly

Important rules:
- NEVER provide medical advice, clinical recommendations, or specific treatment protocols
- NEVER mention specific facility addresses or locations
- Keep building rapport naturally — don't rush through questions
- If they share something emotional, acknowledge it briefly before continuing
- One question per reply, keep it conversational
- Occasionally drop an apostrophe or skip capitalization to sound natural (e.g., "thats great" or "dont worry")`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
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

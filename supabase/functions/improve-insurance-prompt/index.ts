const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { draft } = await req.json();

    if (!draft || typeof draft !== 'string' || draft.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'Please write at least a short draft first (10+ characters).' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert prompt engineer specializing in conversational AI for healthcare intake. Your job is to take a user's rough draft of insurance collection instructions and rewrite them into a clear, structured, step-by-step prompt that a chat AI agent will follow during conversations with visitors.

Rules for the improved prompt:
- Write in second person ("You must...", "Ask the visitor...")
- Use clear numbered steps with branching logic where appropriate
- Keep the tone directive but natural — the AI should still sound like a friendly human
- Preserve ALL the user's original intent and logic — don't remove anything they mentioned
- Add clarifying details where the draft is vague (e.g., "ask for insurance" → specify what to ask)
- Include handling for edge cases the user may have missed (e.g., visitor doesn't have insurance, visitor is unsure)
- Keep it concise — no unnecessary fluff
- Do NOT include any preamble or explanation. Output ONLY the improved prompt text.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Here is my rough draft of insurance collection instructions for our chat AI agent:\n\n${draft}\n\nPlease rewrite this into a clear, structured prompt.` },
        ],
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      const errorMessage = errorJson?.error?.message ?? 'AI service error';
      console.error('Anthropic API error:', response.status, errorMessage);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const improved = data.content?.[0]?.text;

    if (!improved) {
      return new Response(JSON.stringify({ error: 'No response from AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ improved }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('improve-insurance-prompt error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

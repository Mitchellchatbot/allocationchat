import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are a sales assistant for a doctor recruitment platform. The platform connects qualified doctors with practice opportunities using an AI chat widget on recruitment websites.

Your job is to:
- Answer questions about the platform's features and how it works
- Help potential customers (recruitment agencies, medical groups) understand the value
- Encourage them to book a demo call - this is your PRIMARY goal
- Be friendly, concise, and helpful

Key product details:
- AI chat that engages doctor candidates on recruitment websites 24/7
- Captures doctor leads naturally through conversation (specialty, training country, age, contact info)
- Automatic qualification scoring based on specialty and training background
- Integrates with Zoho CRM, Slack, Calendly, and Email
- Human agent handoff with full conversation context
- Conversion analytics dashboard

Keep responses to 1-3 sentences. Be conversational and helpful, not salesy. If someone asks about something you don't know, suggest they reach out to the team.

BOOKING A DEMO (PRIMARY GOAL):
After 1-2 exchanges, proactively suggest booking a quick demo call. If the visitor mentions "demo", "book", "call", "schedule", or shows interest, push toward booking. Always aim to end the conversation with a booked demo.

LEAD CAPTURE:
Your secondary goal is to naturally collect the visitor's contact information so the team can follow up. Ask for their name first, then their phone number or email. If they decline any field, respect that and stop asking.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    console.log(`[sales-chat] Processing ${messages.length} messages`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[sales-chat] AI API error [${response.status}]:`, errorText);
      throw new Error(`AI API call failed [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "I'm here to help! Feel free to ask about Allocation Assist.";

    console.log(`[sales-chat] Reply generated successfully`);

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[sales-chat] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

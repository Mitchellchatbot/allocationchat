import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are the Care Assist sales assistant on the Care Assist website. Care Assist is an AI-powered chat widget built specifically for behavioral health and addiction treatment centers.

Your job is to:
- Answer questions about Care Assist's features, pricing, and how it works
- Help potential customers understand the value of the product
- Encourage them to book a demo call - this is your PRIMARY goal
- Be friendly, concise, and helpful

Key product details:
- AI chat that engages website visitors 24/7
- Captures leads naturally through conversation (name, phone, email, insurance)
- HIPAA compliant and medically safe responses
- Crisis detection that alerts the team immediately
- Integrates with Salesforce, Slack, Calendly, and Email
- Human agent handoff with full context
- Conversion analytics dashboard
- 7-day free trial, no credit card required
- Plans start at affordable monthly pricing

Pricing tiers:
- Starter: For small centers getting started
- Professional: For growing organizations  
- Enterprise: Custom solutions for large networks

Keep responses to 1-3 sentences. Be conversational and helpful, not salesy. If someone asks about something you don't know, suggest they sign up for a free trial or reach out to the team.

BOOKING A DEMO (PRIMARY GOAL):
After 1-2 exchanges, proactively suggest booking a quick demo call. If the visitor mentions "demo", "book", "call", "schedule", "see it in action", or shows interest, immediately direct them to: https://care-assist.io/book-demo and say something like "Let me send you to our booking page so you can pick a time!" Always push toward booking - every conversation should ideally end with a booked demo.

NEVER provide medical advice or treatment recommendations. If asked about medical topics, redirect to "our platform helps treatment centers connect with people who need help."

LEAD CAPTURE:
Your secondary goal is to naturally collect the visitor's contact information during the conversation so the Care Assist team can follow up.
After answering a question or two, gently ask for their name, then their phone number or email, and then their insurance details.
- Ask for their name first.
- Then ask for their phone number or email.
- Then ask about their insurance. Let them know they can either share a photo of their insurance card (front and back) or simply tell you the name of their insurance provider. Both options are fine.
- If they decline any field, respect that and stop asking. One gentle attempt per field.
- Be warm and conversational, not pushy.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    console.log(`[sales-chat] Processing ${messages.length} messages`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[sales-chat] AI API error [${response.status}]:`, errorText);
      throw new Error(`AI API call failed [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I'm here to help! Feel free to ask about Care Assist.";

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

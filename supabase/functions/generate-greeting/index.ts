import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, description, businessType } = await req.json();

    if (!companyName && !description && !businessType) {
      return new Response(
        JSON.stringify({ success: false, error: 'At least one of companyName, description, or businessType is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context for the AI
    const context = [
      companyName && `Business name: ${companyName}`,
      description && `About: ${description}`,
      businessType && `Industry: ${businessType}`,
    ].filter(Boolean).join('\n');

    console.log('Generating greeting for:', { companyName, businessType });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a greeting writer for chat widgets. Generate a single, warm welcome message that:
- Is 1-2 sentences maximum
- Feels human and conversational, not corporate
- Is welcoming but general enough to work for any visitor
- Does NOT mention specific services, products, or details about the business
- Does NOT ask multiple questions
- Ends with a simple offer to help or chat
- Uses a friendly, approachable tone
- Can include ONE emoji at most (optional)

Examples of good greetings:
- "Hey there! 👋 Welcome! How can we help you today?"
- "Hi! We're glad you stopped by. What can we help you with?"
- "Welcome! Feel free to ask us anything."

Do NOT write greetings like:
- "Welcome to [company]! We offer X, Y, and Z services..." (too specific)
- "Hi! Are you looking for treatment? Insurance? A consultation?" (too many questions)
- "Hello and welcome! Our team of certified professionals..." (too corporate)`
          },
          {
            role: 'user',
            content: `Generate a single greeting message for this business:\n\n${context}\n\nRespond with ONLY the greeting text, nothing else.`
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate greeting' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const greeting = data.choices?.[0]?.message?.content?.trim();

    if (!greeting) {
      return new Response(
        JSON.stringify({ success: false, error: 'No greeting generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generated greeting:', greeting);

    return new Response(
      JSON.stringify({ success: true, greeting }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating greeting:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate greeting';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

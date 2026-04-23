import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const QUALIFIED_COUNTRIES = [
  'europe', 'united kingdom', 'uk', 'united states', 'usa', 'us', 'america',
  'canada', 'south africa', 'australia', 'new zealand', 'south america',
];

interface ExtractedInfo {
  name?: string;
  email?: string;
  phone?: string;
  age?: string;
  specialty?: string;
  country_of_training?: string;
}

const EXTRACT_FIELDS: (keyof ExtractedInfo)[] = [
  'name', 'email', 'phone', 'age', 'specialty', 'country_of_training',
];

const isPlaceholder = (val?: string | null): boolean => {
  if (!val) return true;
  const normalized = val.trim().toLowerCase();
  return ['n/a', 'na', 'none', 'unknown', 'not provided', 'not available', ''].includes(normalized);
};

const cleanValue = (val?: string): string | undefined => {
  if (!val || isPlaceholder(val)) return undefined;
  return val;
};

function isQualified(visitor: Record<string, string | null>): boolean {
  const country = (visitor.country_of_training || '').toLowerCase();
  const countryOk = QUALIFIED_COUNTRIES.some(c => country.includes(c));
  if (!countryOk) return false;

  const age = parseInt(visitor.age || '');
  if (isNaN(age) || age < 30 || age > 60) return false;

  return true;
}

function dispatchPhoneNotifications(
  supabase: ReturnType<typeof createClient>,
  propertyId: string,
  conversationId: string,
  visitorName: string | null,
  phone: string,
) {
  const payload = {
    propertyId,
    eventType: 'phone_submission',
    visitorName,
    visitorPhone: phone,
    conversationId,
  };
  supabase.functions.invoke('send-email-notification', { body: payload }).catch((e: any) =>
    console.error('Phone email notification error:', e)
  );
  supabase.functions.invoke('send-slack-notification', { body: payload }).catch((e: any) =>
    console.error('Phone slack notification error:', e)
  );
  supabase.functions.invoke('send-google-chat-notification', { body: payload }).catch((e: any) =>
    console.error('Phone Google Chat notification error:', e)
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visitorId, conversationHistory } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not configured');

    if (!visitorId || !conversationHistory || conversationHistory.length === 0) {
      return new Response(JSON.stringify({ extracted: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: visitor } = await supabase
      .from('visitors')
      .select('name, email, phone, age, specialty, country_of_training')
      .eq('id', visitorId)
      .single();

    const conversationText = conversationHistory
      .map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 20000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: `You are an information extraction assistant. Analyze the conversation and extract any personal information the doctor has shared naturally. Only extract information that was explicitly stated by the user (doctor messages), not inferred. If information is not clearly stated, do NOT include it — leave the field out entirely. Never return placeholder values like "N/A", "none", "unknown", or empty strings.`,
        messages: [
          {
            role: 'user',
            content: `Extract any personal information from this conversation:\n\n${conversationText}`,
          },
        ],
        tools: [
          {
            name: 'extract_visitor_info',
            description: 'Extract personal information from the conversation',
            input_schema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: "The doctor's full name if they mentioned it" },
                email: { type: 'string', description: "The doctor's email address if they shared it" },
                phone: { type: 'string', description: "The doctor's phone number if they shared it" },
                age: { type: 'string', description: "The doctor's age if mentioned" },
                specialty: { type: 'string', description: "The doctor's medical specialty (e.g. Cardiology, Radiology, General Practice, Surgery)" },
                country_of_training: { type: 'string', description: "The country where the doctor completed their medical training" },
              },
              additionalProperties: false,
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'extract_visitor_info' },
      }),
      signal: aiController.signal,
    });
    clearTimeout(aiTimeout);

    if (!response.ok) {
      console.error('AI extraction error:', response.status);
      return new Response(JSON.stringify({ extracted: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    // Anthropic tool use: content array contains a block with type "tool_use"
    const toolUse = data.content?.find((b: { type: string }) => b.type === 'tool_use');

    if (!toolUse) {
      return new Response(JSON.stringify({ extracted: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let extractedInfo: ExtractedInfo;
    try {
      extractedInfo = toolUse.input as ExtractedInfo;
    } catch {
      return new Response(JSON.stringify({ extracted: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updates: Partial<ExtractedInfo> = {};
    for (const field of EXTRACT_FIELDS) {
      const extracted = cleanValue(extractedInfo[field]);
      const existing = visitor?.[field];
      if (extracted && isPlaceholder(existing)) {
        updates[field] = extracted;
      }
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ extracted: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Updating visitor with extracted info:', updates);

    const { error: updateError } = await supabase
      .from('visitors')
      .update(updates)
      .eq('id', visitorId);

    if (updateError) {
      console.error('Error updating visitor:', updateError);
    }

    // Recompute qualification using merged data
    const merged = { ...visitor, ...updates } as Record<string, string | null>;
    const hasQualFields = !isPlaceholder(merged.country_of_training) && !isPlaceholder(merged.age);

    if (hasQualFields) {
      const qualified = isQualified(merged);
      await supabase.from('visitors').update({ qualified }).eq('id', visitorId);
      console.log(`Visitor ${visitorId} qualified: ${qualified}`);
    }

    // Side effects: notifications + Zoho export queue (triggered when phone is captured)
    if (updates.phone) {
      try {
        const { data: conv } = await supabase
          .from('conversations')
          .select('id, property_id, is_test')
          .eq('visitor_id', visitorId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Why: test conversations come from widget preview — firing real notifications
        // or enqueueing Zoho exports for preview chats would spam property owners and
        // push fake leads into their CRM.
        if (conv && !conv.is_test) {
          dispatchPhoneNotifications(supabase, conv.property_id, conv.id, updates.name || visitor?.name || null, updates.phone);

          // Enqueue Zoho export — zoho-export-leads will skip unqualified leads
          const { error: qErr } = await supabase
            .from('zoho_export_queue')
            .insert({
              property_id: conv.property_id,
              visitor_id: visitorId,
              conversation_id: conv.id,
              trigger_type: 'phone',
              status: 'pending',
              next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (qErr && (qErr as any).code !== '23505') console.error('Failed to enqueue Zoho export:', qErr);
          else if (!qErr) console.log(`Enqueued Zoho export for visitor ${visitorId}`);
        } else if (conv?.is_test) {
          console.log(`Skipping phone side-effects for test conversation ${conv.id}`);
        }
      } catch (sideEffectErr) {
        console.error('Error in side-effects:', sideEffectErr);
      }
    }

    return new Response(JSON.stringify({ extracted: true, info: updates }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    if (isAbort) {
      console.error('AI extraction timed out after 20s');
      return new Response(JSON.stringify({ extracted: false, error: 'AI extraction timed out' }), {
        status: 504,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('Extract visitor info error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

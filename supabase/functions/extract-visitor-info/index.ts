import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedInfo {
  name?: string;
  email?: string;
  phone?: string;
  age?: string;
  date_of_birth?: string;
  occupation?: string;
  addiction_history?: string;
  drug_of_choice?: string;
  treatment_interest?: string;
  insurance_company?: string;
  member_id?: string;
  insurance_info?: string;
  urgency_level?: string;
}

const EXTRACT_FIELDS: (keyof ExtractedInfo)[] = [
  'name', 'email', 'phone', 'age', 'date_of_birth', 'occupation',
  'addiction_history', 'drug_of_choice', 'treatment_interest',
  'insurance_company', 'member_id', 'insurance_info', 'urgency_level',
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


/** Fire-and-forget: send phone/email notifications for newly captured phone */
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

/** Fire-and-forget: send Google Chat notification when insurance info is captured */
function dispatchInsuranceNotification(
  supabase: ReturnType<typeof createClient>,
  propertyId: string,
  conversationId: string,
  visitorName: string | null,
) {
  const payload = {
    propertyId,
    eventType: 'insurance_submission',
    visitorName,
    conversationId,
  };
  supabase.functions.invoke('send-google-chat-notification', { body: payload }).catch((e: any) =>
    console.error('Insurance Google Chat notification error:', e)
  );
}



// ── Main handler ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visitorId, conversationHistory } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');

    if (!visitorId || !conversationHistory || conversationHistory.length === 0) {
      return new Response(JSON.stringify({ extracted: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current visitor data
    const { data: visitor } = await supabase
      .from('visitors')
      .select('name, email, phone, age, date_of_birth, occupation, addiction_history, drug_of_choice, treatment_interest, insurance_company, member_id, insurance_info, urgency_level')
      .eq('id', visitorId)
      .single();

    const conversationText = conversationHistory
      .map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`)
      .join('\n');

    // ── AI extraction with 20s timeout ───────────────────────────────────
    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 20000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an information extraction assistant. Analyze the conversation and extract any personal information the visitor has shared naturally. Only extract information that was explicitly stated by the visitor (user messages), not inferred. If information is not clearly stated, do NOT include it — leave the field out entirely. Never return placeholder values like "N/A", "none", "unknown", or empty strings.`
          },
          {
            role: 'user',
            content: `Extract any personal information from this conversation:\n\n${conversationText}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_visitor_info',
              description: 'Extract personal information from the conversation',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: "The visitor's name if they mentioned it" },
                  email: { type: 'string', description: "The visitor's email address if they shared it" },
                  phone: { type: 'string', description: "The visitor's phone number if they shared it" },
                  age: { type: 'string', description: "The visitor's age or age range if mentioned" },
                  date_of_birth: { type: 'string', description: "The visitor's date of birth or birthday if mentioned (any format)" },
                  occupation: { type: 'string', description: "The visitor's job, profession, or occupation if mentioned" },
                  addiction_history: { type: 'string', description: 'Any mention of past or current substance use, addiction history, how long they have been struggling, or relapse history' },
                  drug_of_choice: { type: 'string', description: 'Specific substances mentioned like alcohol, opioids, heroin, fentanyl, meth, cocaine, prescription pills, benzodiazepines, marijuana, etc.' },
                  treatment_interest: { type: 'string', description: 'What type of treatment they are seeking: inpatient, outpatient, detox, residential, PHP, IOP, therapy, counseling, rehab' },
                  insurance_company: { type: 'string', description: 'The name of the insurance company or provider mentioned (Blue Cross, Aetna, Cigna, UnitedHealthcare, Humana, Medicaid, Medicare, etc.)' },
                  member_id: { type: 'string', description: 'Insurance member ID, policy number, or subscriber ID if mentioned' },
                  insurance_info: { type: 'string', description: 'Any other insurance-related info like plan type, self-pay, or concerns about payment/cost that does not fit into insurance_company or member_id' },
                  urgency_level: { type: 'string', description: 'How urgent their situation is: crisis/immediate need, ready to start treatment, planning for near future, or just researching options' },
                },
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_visitor_info' } },
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ extracted: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let extractedInfo: ExtractedInfo;
    try {
      extractedInfo = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ extracted: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Diff: only update fields that are newly extracted ────────────────
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

    const { error } = await supabase
      .from('visitors')
      .update(updates)
      .eq('id', visitorId);

    if (error) {
      console.error('Error updating visitor:', error);
    }

    // ── Side-effects: notifications & Salesforce (deferred export) ──
    const needsNotifications = updates.phone;
    const hasNewInsuranceField = updates.insurance_info || updates.insurance_company || updates.member_id || updates.date_of_birth;
    const needsSideEffects = needsNotifications || updates.phone || hasNewInsuranceField;

    if (needsSideEffects) {
      try {
        const { data: conv } = await supabase
          .from('conversations')
          .select('id, property_id')
          .eq('visitor_id', visitorId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (conv) {
          // Phone notifications (still immediate)
          if (updates.phone) {
            dispatchPhoneNotifications(supabase, conv.property_id, conv.id, updates.name || visitor?.name || null, updates.phone);
          }

          // Determine which SF export trigger to flag (deferred, not immediate)
          let exportTrigger: string | null = null;

          if (updates.phone) {
            exportTrigger = 'phone';
          }

          if (hasNewInsuranceField) {
            const merged = { ...visitor, ...updates };
            const { data: prop } = await supabase
              .from('properties')
              .select('ai_collect_insurance_company, ai_collect_member_id, ai_collect_date_of_birth, ai_insurance_collection_enabled')
              .eq('id', conv.property_id)
              .single();

            let insuranceComplete = true;
            if (prop?.ai_insurance_collection_enabled) {
              if (prop.ai_collect_insurance_company && isPlaceholder(merged.insurance_company)) insuranceComplete = false;
              if (prop.ai_collect_member_id && isPlaceholder(merged.member_id)) insuranceComplete = false;
              if (prop.ai_collect_date_of_birth && isPlaceholder(merged.date_of_birth)) insuranceComplete = false;
              console.log('Insurance completeness check:', {
                insuranceComplete,
                insurance_company: !!merged.insurance_company,
                member_id: !!merged.member_id,
                date_of_birth: !!merged.date_of_birth,
              });
            }

            if (insuranceComplete) {
              exportTrigger = 'insurance';
              dispatchInsuranceNotification(supabase, conv.property_id, conv.id, updates.name || visitor?.name || null);
            } else {
              console.log('Skipping insurance export flag, not all required fields collected yet');
            }
          }

          // Flag the conversation for deferred export (5 min after last visitor message)
          // AND write to the persistent export queue immediately as a failsafe.
          if (exportTrigger) {
            console.log(`Flagging conversation ${conv.id} for deferred SF export (trigger: ${exportTrigger})`);
            await supabase
              .from('conversations')
              .update({ sf_export_ready_at: new Date().toISOString(), sf_export_trigger: exportTrigger })
              .eq('id', conv.id);

            // Belt-and-suspenders: enqueue directly so the lead is never lost even
            // if the flag is cleared before the cron picks it up.
            // Plain insert — partial unique index prevents ON CONFLICT upsert syntax.
            // 23505 = duplicate key (already queued and active), which is fine to ignore.
            const { error: qErr } = await supabase
              .from('salesforce_export_queue')
              .insert({
                property_id: conv.property_id,
                visitor_id: visitorId,
                conversation_id: conv.id,
                trigger_type: exportTrigger,
                status: 'pending',
                next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (qErr && (qErr as any).code !== '23505') console.error('Failed to enqueue SF export:', qErr);
            else if (!qErr) console.log(`Enqueued SF export for visitor ${visitorId} trigger=${exportTrigger}`);
          }
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

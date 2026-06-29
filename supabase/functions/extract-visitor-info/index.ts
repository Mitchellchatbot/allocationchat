import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Qualified regions plus their constituent countries. We match with word
// boundaries (not substring) — substring matching let "russia" qualify because
// it contains "us", and rejected legitimate replies like "Brazil" or "Germany"
// because they don't literally contain "south america" or "europe".
const QUALIFIED_COUNTRIES = [
  // Region names (covers free-text answers like "trained in Europe")
  'europe', 'south america',
  // North America
  'united states', 'usa', 'us', 'u.s.', 'u.s.a.', 'america', 'canada', 'mexico',
  'belize', 'costa rica', 'el salvador', 'guatemala', 'honduras', 'nicaragua', 'panama',
  'japan', 'south korea', 'republic of korea', 'singapore', 'turkey', 'türkiye', 'turkiye', 'cuba',
  'méxico', 'perú', 'panamá',
  'uae', 'united arab emirates', 'emirates', 'dubai', 'abu dhabi',
  // UK + constituents
  'united kingdom', 'uk', 'u.k.', 'great britain', 'britain', 'england', 'scotland', 'wales', 'northern ireland',
  // Oceania + Africa
  'australia', 'new zealand', 'south africa',
  // South American countries
  'argentina', 'bolivia', 'brazil', 'brasil', 'chile', 'colombia', 'ecuador',
  'guyana', 'paraguay', 'peru', 'suriname', 'uruguay', 'venezuela', 'french guiana',
  // European countries (commonly named in lieu of "Europe")
  'ireland', 'germany', 'france', 'spain', 'italy', 'portugal', 'netherlands',
  'holland', 'belgium', 'switzerland', 'austria', 'sweden', 'norway', 'denmark',
  'finland', 'iceland', 'poland', 'czech republic', 'czechia', 'slovakia',
  'hungary', 'romania', 'bulgaria', 'greece', 'croatia', 'slovenia', 'serbia',
  'albania', 'bosnia', 'montenegro', 'macedonia', 'lithuania', 'latvia',
  'estonia', 'luxembourg', 'malta', 'cyprus',
];

const QUALIFIED_COUNTRIES_REGEX = new RegExp(
  `\\b(${QUALIFIED_COUNTRIES.map(c => c.replace(/[.]/g, '\\.').replace(/\s+/g, '\\s+')).join('|')})\\b`,
  'i',
);

// We place medical DOCTORS only. These non-doctor / allied-health roles are
// disqualifying regardless of country or age. Matched against the extracted
// `specialty` field (set by the Haiku extractor to the person's actual role),
// NOT the raw transcript — so "doctor who works with nurses" won't false-fire.
// Carefully excludes doctor titles that merely sound similar (radiologist,
// physician, psychiatrist). Mirrored in widget-save-message; keep in sync.
const EXCLUDED_PROFESSIONS_REGEX = /\b(dentist(?:ry)?|dental\s+(?:surgeon|hygienist|nurse)|orthodontist|periodontist|endodontist|prosthodontist|nurse|nursing|midwife|midwifery|radiographer|sonographer|pharmacist|physiotherap(?:y|ist)|physical\s+therap(?:y|ist)|occupational\s+therap(?:y|ist)|speech\s+(?:(?:and\s+)?language\s+)?therap(?:y|ist)|dietitian|dietician|nutritionist|optometrist|optician|podiatrist|chiropodist|paramedic|phlebotomist|technician|technologist)\b/i;

// Family Medicine / General Practice doctors are only placed if they speak
// Arabic — this gate applies to NO other specialty. Matched against the
// extracted `specialty` field. Keep in sync with zoho-export-leads,
// widget-save-message, and the dashboard's VisitorLeadsTable.
const FAMILY_GP_REGEX = /(\bfamily\s+(?:medicine|physician|practice|practitioner|doctor)\b|\bgeneral\s+(?:practice|practitioner|physician)\b|\bgp\b|\bprimary\s+care\b)/i;

interface ExtractedInfo {
  name?: string;
  email?: string;
  phone?: string;
  age?: string;
  specialty?: string;
  country_of_training?: string;
  qualification_date?: string;
  booking_call_required?: boolean;
  speaks_arabic?: boolean;
}

// String fields — only set if non-placeholder values are extracted.
const EXTRACT_STRING_FIELDS: (keyof ExtractedInfo)[] = [
  'name', 'email', 'phone', 'age', 'specialty', 'country_of_training', 'qualification_date',
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

function isQualified(visitor: Record<string, unknown>): boolean {
  // Doctors only — a non-doctor role disqualifies regardless of country/age.
  const specialty = String(visitor.specialty || '');
  if (EXCLUDED_PROFESSIONS_REGEX.test(specialty)) return false;

  // Family Medicine / GP — only Arabic-speaking candidates. Unknown (null)
  // counts as not-yet-qualified, so these leads aren't exported until the
  // doctor has confirmed they speak Arabic.
  if (FAMILY_GP_REGEX.test(specialty) && visitor.speaks_arabic !== true) return false;

  const country = String(visitor.country_of_training || '');
  if (!QUALIFIED_COUNTRIES_REGEX.test(country)) return false;

  // Age is no longer required, but if it was provided and falls outside 30-60, treat as unqualified.
  const ageRaw = String(visitor.age ?? '').trim();
  if (ageRaw) {
    const age = parseInt(ageRaw);
    if (!isNaN(age) && (age < 30 || age > 60)) return false;
  }

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
      .select('name, email, phone, age, specialty, country_of_training, qualification_date, booking_call_required, speaks_arabic')
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
        system: `You are an information extraction assistant. Analyze the conversation and extract any personal information the doctor has shared naturally. Only extract information that was explicitly stated by the user (doctor messages), not inferred. If information is not clearly stated, do NOT include it — leave the field out entirely. Never return placeholder values like "N/A", "none", "unknown", or empty strings.

For booking_call_required: set this to true ONLY if the AI asked the doctor for their phone/mobile number AND the doctor either (a) explicitly declined (e.g. "no", "I'd rather not", "I don't want to share that") or (b) deflected the question and never came back to it. Do NOT set it true if the doctor did share a phone number, or if the phone question hasn't been asked yet. Leave the field unset (omit it) when the answer is unclear.

For speaks_arabic: set to true if the doctor indicated they speak Arabic, or false if they indicated they do NOT speak Arabic. Only set it when language was explicitly discussed — leave the field unset (omit it) otherwise.`,
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
                qualification_date: { type: 'string', description: "The date or year the doctor obtained their specialty qualification (e.g. '2015', 'June 2018')" },
                booking_call_required: { type: 'boolean', description: "True if the doctor declined to share their phone number, or was asked for it and didn't reply with one. Leave unset otherwise." },
                speaks_arabic: { type: 'boolean', description: "True if the doctor said they speak Arabic, false if they said they do not. Leave unset if language was not discussed." },
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
    for (const field of EXTRACT_STRING_FIELDS) {
      const extracted = cleanValue(extractedInfo[field] as string | undefined);
      const existing = visitor?.[field as string];
      if (extracted && isPlaceholder(existing)) {
        (updates as any)[field] = extracted;
      }
    }

    // booking_call_required is a boolean — only flip from false → true, never the
    // other way (a doctor who declined once shouldn't get un-flagged by a later
    // re-extraction). Stored as a real boolean column, not a placeholder string.
    if (extractedInfo.booking_call_required === true && (visitor as any)?.booking_call_required !== true) {
      (updates as any).booking_call_required = true;
    }

    // speaks_arabic — gates Family Medicine / GP qualification. Unlike the
    // booking flag, this can move both ways (a doctor who first said "no" may
    // clarify later), so update whenever the newly-extracted value differs from
    // what's stored. Only ever set from an explicit boolean (never from omit).
    if (typeof extractedInfo.speaks_arabic === 'boolean' && (visitor as any)?.speaks_arabic !== extractedInfo.speaks_arabic) {
      (updates as any).speaks_arabic = extractedInfo.speaks_arabic;
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

    // Recompute qualification using merged data. Country of training is the
    // binding signal — isQualified() treats age as optional (it only fails on an
    // age that's explicitly provided AND out of range), so we must NOT wait for
    // an age that many doctors never share. Previously this gate required both
    // country AND age, which left qualified=NULL forever for doctors like a
    // US-trained endocrinologist who gave a country but no age. Recompute as
    // soon as we have a country; the Family/GP Arabic gate is also covered then.
    const merged = { ...visitor, ...updates } as Record<string, unknown>;
    const recompute = !isPlaceholder(merged.country_of_training as string | null);

    if (recompute) {
      const qualified = isQualified(merged);
      await supabase.from('visitors').update({ qualified }).eq('id', visitorId);
      console.log(`Visitor ${visitorId} qualified: ${qualified}`);
    }

    // Side effects: notifications (phone only) + Zoho export queue.
    // Per Mitch: a qualified doctor who shares email but not phone should still
    // land in Zoho so the team can follow up via email. So enqueue on EITHER
    // phone or email capture this turn — the export function will still skip
    // unqualified leads at run time, but qualified email-only leads now get
    // exported.
    //
    // Safety-net: even if neither phone NOR email was captured THIS turn, if the
    // visitor already has a contact in the DB and their country of training is
    // qualified, enqueue anyway. Catches the case where the original
    // on-capture enqueue failed silently or a later extraction would otherwise
    // never re-enqueue. The unique constraint on visitor_id makes this safe.
    const phoneCaptured = !!updates.phone;
    const emailCaptured = !!updates.email;
    const mergedPhone = updates.phone || visitor?.phone;
    const mergedEmail = updates.email || visitor?.email;
    const hasContactInDb = !isPlaceholder(mergedPhone) || !isPlaceholder(mergedEmail);
    const mergedCountry = (updates.country_of_training || visitor?.country_of_training || '').toLowerCase();
    const countryQualifiedNow = !!mergedCountry && QUALIFIED_COUNTRIES_REGEX.test(mergedCountry);
    const safetyNetReady = hasContactInDb && countryQualifiedNow;

    if (phoneCaptured || emailCaptured || safetyNetReady) {
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
          if (phoneCaptured) {
            dispatchPhoneNotifications(supabase, conv.property_id, conv.id, updates.name || visitor?.name || null, updates.phone!);
          }

          // Enqueue Zoho export — zoho-export-leads will skip unqualified leads.
          // The unique constraint on (visitor_id) makes the second enqueue a noop
          // when the doctor shares phone after email (or vice versa), or when
          // the safety-net re-fires on a later turn.
          const trigger = phoneCaptured ? 'phone' : (emailCaptured ? 'email' : 'safety_net');
          const { error: qErr } = await supabase
            .from('zoho_export_queue')
            .insert({
              property_id: conv.property_id,
              visitor_id: visitorId,
              conversation_id: conv.id,
              trigger_type: trigger,
              status: 'pending',
              next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (qErr && (qErr as any).code !== '23505') console.error('Failed to enqueue Zoho export:', qErr);
          else if (!qErr) console.log(`Enqueued Zoho export for visitor ${visitorId} (trigger=${trigger})`);
        } else if (conv?.is_test) {
          console.log(`Skipping contact-capture side-effects for test conversation ${conv.id}`);
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

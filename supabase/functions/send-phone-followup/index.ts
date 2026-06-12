// Cron-triggered: for conversations where the AI asked for a phone number but
// the doctor hasn't replied within ~1 minute, automatically post a follow-up
// agent message offering the Calendly booking link. Also flips the visitor's
// booking_call_required flag so the Zoho export surfaces them with the
// "Booking a Call Required" note in the Description.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mirrors QUALIFIED_COUNTRIES in extract-visitor-info / zoho-export-leads /
// widget-save-message. If you add a country to any of those, add it here too.
const FOLLOWUP_QUALIFIED_COUNTRIES = [
  'europe', 'south america', 'united states', 'usa', 'us', 'u.s.', 'u.s.a.', 'america', 'canada', 'mexico',
  'belize', 'costa rica', 'el salvador', 'guatemala', 'honduras', 'nicaragua', 'panama',
  'japan', 'south korea', 'republic of korea', 'singapore', 'turkey', 'türkiye', 'turkiye', 'cuba',
  'méxico', 'perú', 'panamá',
  'uae', 'united arab emirates', 'emirates', 'dubai', 'abu dhabi',
  'united kingdom', 'uk', 'u.k.', 'great britain', 'britain', 'england', 'scotland', 'wales', 'northern ireland',
  'australia', 'new zealand', 'south africa',
  'argentina', 'bolivia', 'brazil', 'brasil', 'chile', 'colombia', 'ecuador',
  'guyana', 'paraguay', 'peru', 'suriname', 'uruguay', 'venezuela', 'french guiana',
  'ireland', 'germany', 'france', 'spain', 'italy', 'portugal', 'netherlands',
  'holland', 'belgium', 'switzerland', 'austria', 'sweden', 'norway', 'denmark',
  'finland', 'iceland', 'poland', 'czech republic', 'czechia', 'slovakia',
  'hungary', 'romania', 'bulgaria', 'greece', 'croatia', 'slovenia', 'serbia',
  'albania', 'bosnia', 'montenegro', 'macedonia', 'lithuania', 'latvia',
  'estonia', 'luxembourg', 'malta', 'cyprus',
];
const FOLLOWUP_QUALIFIED_COUNTRIES_REGEX = new RegExp(
  `\\b(${FOLLOWUP_QUALIFIED_COUNTRIES.map(c => c.replace(/[.]/g, '\\.').replace(/\s+/g, '\\s+')).join('|')})\\b`,
  'i',
);

// Calendly rotation helper — mirrored from chat-ai and widget-save-message.
// Picks the next URL after the last one actually shown to a doctor at this
// property, caches the choice on the conversation row.
// deno-lint-ignore no-explicit-any
async function pickCalendlyForConversation(sb: any, conversationId: string, urls: string[]): Promise<string | null> {
  if (urls.length === 0) return null;
  if (urls.length === 1) return urls[0];
  const { data: conv } = await sb
    .from('conversations')
    .select('calendly_url, property_id')
    .eq('id', conversationId)
    .maybeSingle();
  if (conv?.calendly_url && urls.includes(conv.calendly_url)) return conv.calendly_url;
  if (!conv?.property_id) return urls[0];
  const normalize = (u: string) => u.trim().replace(/[?#].*$/, '').replace(/\/$/, '');
  const normalizedList = urls.map(normalize);
  const { data: lastShown } = await sb
    .from('messages')
    .select('content, conversations!inner(property_id)')
    .eq('conversations.property_id', conv.property_id)
    .eq('sender_type', 'agent')
    .ilike('content', '%calendly.com/%')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextIdx = 0;
  if (lastShown?.content) {
    const match = String(lastShown.content).match(/https?:\/\/[^\s)]*calendly\.com\/\S+/i);
    if (match) {
      const lastIdx = normalizedList.indexOf(normalize(match[0]));
      if (lastIdx !== -1) nextIdx = (lastIdx + 1) % urls.length;
    }
  }
  const picked = urls[nextIdx];
  await sb.from('conversations').update({ calendly_url: picked }).eq('id', conversationId);
  return picked;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Fire the Calendly fallback if the doctor has been silent on the
  // phone-number question for >=30s. Cap lookback at 1 hour so we don't
  // re-process ancient threads if phone_followup_sent ever gets reset.
  const cutoff = new Date(Date.now() - 30 * 1000).toISOString();
  const lowerBound = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: candidates, error } = await supabase
    .from("conversations")
    .select("id, property_id, visitor_id, phone_asked_at")
    .eq("phone_followup_sent", false)
    .neq("status", "closed")
    .lt("phone_asked_at", cutoff)
    .gt("phone_asked_at", lowerBound)
    .limit(50);

  if (error) {
    console.error("send-phone-followup: query error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!candidates || candidates.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let skipped = 0;

  for (const conv of candidates) {
    try {
      // Skip if the visitor has already replied since the phone was asked
      const { data: laterVisitorMsg } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conv.id)
        .eq("sender_type", "visitor")
        .gt("created_at", conv.phone_asked_at!)
        .limit(1)
        .maybeSingle();

      if (laterVisitorMsg) {
        // Visitor responded — clear the trigger so a future re-ask can fire again
        await supabase
          .from("conversations")
          .update({ phone_asked_at: null, phone_followup_sent: false })
          .eq("id", conv.id);
        skipped++;
        continue;
      }

      // Only offer Calendly when ALL three are true:
      //   (1) country_of_training is in a qualified region
      //   (2) phone hasn't been shared yet (the whole point of the fallback)
      //   (3) age is unknown OR within 30-60
      // We compute this inline rather than reading visitors.qualified, because
      // qualified only flips once both country and age are extracted — a
      // non-qualified doctor who never shares age would slip through.
      const { data: visitor } = await supabase
        .from("visitors")
        .select("phone, country_of_training, age")
        .eq("id", conv.visitor_id)
        .maybeSingle();

      const phoneNotGiven = !visitor?.phone || /^(n\/a|na|none|unknown|not provided|not available)$/i.test(String(visitor.phone).trim());
      if (!phoneNotGiven) {
        await supabase
          .from("conversations")
          .update({ phone_followup_sent: true })
          .eq("id", conv.id);
        skipped++;
        continue;
      }

      const country = visitor?.country_of_training || '';
      const countryOk = !!country && FOLLOWUP_QUALIFIED_COUNTRIES_REGEX.test(country);
      const ageRaw = visitor?.age ? String(visitor.age).trim() : '';
      const ageNum = ageRaw ? parseInt(ageRaw, 10) : NaN;
      const ageOk = !ageRaw || isNaN(ageNum) || (ageNum >= 30 && ageNum <= 60);

      if (!countryOk || !ageOk) {
        console.log(`send-phone-followup: skipping ${conv.visitor_id} (country=${countryOk}, ageOk=${ageOk})`);
        await supabase
          .from("conversations")
          .update({ phone_followup_sent: true })
          .eq("id", conv.id);
        skipped++;
        continue;
      }

      // Fetch the property's Calendly URL — required to send a useful fallback
      const { data: property } = await supabase
        .from("properties")
        .select("calendly_url")
        .eq("id", conv.property_id)
        .maybeSingle();

      // properties.calendly_url can hold multiple URLs (one per line). Rotation
      // is "next URL after the last one actually shown" — see
      // pickCalendlyForConversation below for details.
      const calendlyRaw = (property as any)?.calendly_url as string | null;
      const calendlyOptions = (calendlyRaw || '').split(/\s*[\n,]\s*/).map((s: string) => s.trim()).filter(Boolean);
      const calendlyUrl = await pickCalendlyForConversation(supabase, conv.id, calendlyOptions);
      if (!calendlyUrl) {
        // No Calendly configured — mark as sent so we don't keep retrying, but log
        console.warn(`send-phone-followup: skipping ${conv.id} — no Calendly URL on property ${conv.property_id}`);
        await supabase
          .from("conversations")
          .update({ phone_followup_sent: true })
          .eq("id", conv.id);
        skipped++;
        continue;
      }

      // Compose the fallback message (mirrors the prompt's phone-decline copy)
      const followupContent =
        `No problem at all if you'd prefer not to share your number. You can book a zoom call at a time that's convenient for you using this link: ${calendlyUrl}`;

      // Next sequence number for this conversation
      const { data: maxSeq } = await supabase
        .from("messages")
        .select("sequence_number")
        .eq("conversation_id", conv.id)
        .order("sequence_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextSeq = ((maxSeq?.sequence_number as number | undefined) || 0) + 1;

      const { error: insertErr } = await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: "ai-bot",
        sender_type: "agent",
        content: followupContent,
        sequence_number: nextSeq,
      });

      if (insertErr) {
        console.error(`send-phone-followup: insert failed for ${conv.id}:`, insertErr);
        continue;
      }

      // Mark conversation as having the follow-up sent and flip the visitor's
      // booking_call_required flag so the next Zoho export captures it.
      await supabase
        .from("conversations")
        .update({ phone_followup_sent: true, updated_at: new Date().toISOString() })
        .eq("id", conv.id);

      await supabase
        .from("visitors")
        .update({ booking_call_required: true })
        .eq("id", conv.visitor_id);

      sent++;
      console.log(`send-phone-followup: posted Calendly fallback for ${conv.id}`);
    } catch (e) {
      console.error(`send-phone-followup: unexpected error for ${conv.id}:`, e);
    }
  }

  return new Response(JSON.stringify({ sent, skipped, total: candidates.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

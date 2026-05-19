// Widget save message edge function — also handles AI queue state changes
// and auto-creates conversations if needed (merged widget-create-conversation)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mirrors QUALIFIED_COUNTRIES in extract-visitor-info / zoho-export-leads.
// Kept duplicated rather than shared because Deno edge functions in this repo
// don't share modules. If you add a country to either of those files, add it
// here too.
const CALENDLY_QUALIFIED_COUNTRIES = [
  'europe', 'south america', 'united states', 'usa', 'us', 'u.s.', 'u.s.a.', 'america', 'canada', 'mexico',
  'belize', 'costa rica', 'el salvador', 'guatemala', 'honduras', 'nicaragua', 'panama',
  'japan', 'south korea', 'republic of korea', 'singapore',
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
const CALENDLY_QUALIFIED_COUNTRIES_REGEX = new RegExp(
  `\\b(${CALENDLY_QUALIFIED_COUNTRIES.map(c => c.replace(/[.]/g, '\\.').replace(/\s+/g, '\\s+')).join('|')})\\b`,
  'i',
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { conversationId: incomingConvId, propertyId, visitorId, sessionId, senderType, content, aiQueueAction, aiQueuePreview, aiQueueWindowMs } = await req.json();

    if (!visitorId || !sessionId || !senderType || !content) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (senderType !== "visitor" && senderType !== "agent") {
      return new Response(JSON.stringify({ error: "Invalid senderType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let conversationId = incomingConvId;
    let conversationCreated = false;

    // If no conversationId provided, auto-create one (merged create-conversation logic)
    if (!conversationId) {
      if (!propertyId) {
        return new Response(JSON.stringify({ error: "propertyId required when no conversationId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate visitor belongs to this session and property
      const { data: visitor, error: visitorErr } = await supabase
        .from("visitors")
        .select("id,session_id,property_id")
        .eq("id", visitorId)
        .maybeSingle();

      if (visitorErr || !visitor) {
        return new Response(JSON.stringify({ error: "Invalid visitorId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (visitor.session_id !== sessionId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (visitor.property_id !== propertyId) {
        return new Response(JSON.stringify({ error: "Visitor does not belong to this property" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for existing open conversation
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("property_id", propertyId)
        .eq("visitor_id", visitorId)
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv?.id) {
        conversationId = existingConv.id;
      } else {
        // Inherit property-level AI setting for new conversations
        const { data: propRow } = await supabase
          .from("properties")
          .select("ai_enabled")
          .eq("id", propertyId)
          .maybeSingle();
        const propertyAiEnabled = propRow?.ai_enabled !== false;

        // Create new conversation
        const { data: newConv, error: convCreateErr } = await supabase
          .from("conversations")
          .insert({ property_id: propertyId, visitor_id: visitorId, status: "active", ai_enabled: propertyAiEnabled })
          .select("id")
          .single();

        if (convCreateErr || !newConv?.id) {
          console.error("widget-save-message: failed to create conversation", convCreateErr);
          return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        conversationId = newConv.id;
        conversationCreated = true;

        // Fire email + Slack notifications for new conversation (non-blocking)
        const notifyPayload = JSON.stringify({ propertyId, eventType: "new_conversation", conversationId });
        const notifyHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` };

        fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
          method: "POST", headers: notifyHeaders, body: notifyPayload,
        }).catch((err) => console.error("Email notification error:", err));

        fetch(`${supabaseUrl}/functions/v1/send-slack-notification`, {
          method: "POST", headers: notifyHeaders, body: notifyPayload,
        }).catch((err) => console.error("Slack notification error:", err));

        fetch(`${supabaseUrl}/functions/v1/send-google-chat-notification`, {
          method: "POST", headers: notifyHeaders, body: notifyPayload,
        }).catch((err) => console.error("Google Chat notification error:", err));
      }
    } else {
      // Existing path: validate ownership via RPC
      const { data: ownsConv } = await supabase.rpc("visitor_owns_conversation", {
        conv_id: conversationId,
        visitor_session: sessionId,
      });

      if (!ownsConv) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get conversation state (status + property for AI kill-switch check,
    // phone_asked_at to detect decline replies)
    const { data: conv } = await supabase
      .from("conversations")
      .select("status, ai_enabled, property_id, phone_asked_at")
      .eq("id", conversationId)
      .single();

    // If this is a visitor message, enforce the property-level AI kill switch.
    // If the property has ai_enabled=false, immediately disable AI on this conversation
    // so the Realtime subscription on the widget picks it up before chat-ai can fire.
    if (senderType === "visitor" && conv?.ai_enabled !== false) {
      const { data: prop } = await supabase
        .from("properties")
        .select("ai_enabled")
        .eq("id", conv?.property_id ?? "")
        .maybeSingle();

      if (prop?.ai_enabled === false) {
        await supabase
          .from("conversations")
          .update({ ai_enabled: false })
          .eq("id", conversationId);
        // Reflect locally so the updatePayload below doesn't overwrite it
        if (conv) conv.ai_enabled = false;
      }
    }

    // Compute next sequence_number
    const { data: maxSeq } = await supabase
      .from("messages")
      .select("sequence_number")
      .eq("conversation_id", conversationId)
      .order("sequence_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSeq = ((maxSeq?.sequence_number as number | undefined) || 0) + 1;

    const sender_id = senderType === "visitor" ? visitorId : "ai-bot";

    // Deterministic post-processing for AI messages. Sonnet doesn't always obey
    // the prompt's "no em dashes" rule and occasionally pastes the Calendly
    // URL to leads who should never see it — handle both here so the rules are
    // enforced even when the model misses them.
    let cleanedContent = String(content);
    if (senderType === "agent" && sender_id === "ai-bot") {
      // Strip em/en dashes; replace with comma+space or period+space to keep
      // the sentence readable. Em (—) and en (–) both go.
      cleanedContent = cleanedContent
        .replace(/\s*—\s*/g, ", ")
        .replace(/\s*–\s*/g, ", ");

      // Calendly leak guard: if the model pasted the booking link, double-check
      // the visitor's qualification. If they're a hard-no (non-qualified
      // country we know about, or age outside 30-60), strip the URL and the
      // surrounding sentence. We check both the DB (extraction may have run)
      // and the recent transcript (age the doctor just stated this turn).
      if (/calendly\.com\//i.test(cleanedContent)) {
        const { data: vRow } = await supabase
          .from("visitors")
          .select("country_of_training, age")
          .eq("id", visitorId)
          .maybeSingle();
        const v = (vRow as { country_of_training?: string | null; age?: string | null } | null) || {};

        // Pull the last ~10 visitor messages so we can spot age signals the
        // extractor hasn't processed yet (it runs every 2 min on a cron).
        const { data: recentMsgs } = await supabase
          .from("messages")
          .select("content")
          .eq("conversation_id", conversationId)
          .eq("sender_type", "visitor")
          .order("sequence_number", { ascending: false })
          .limit(10);
        const transcript = (recentMsgs || []).map((m: { content: string }) => m.content).join(" ");

        // Age check — DB first, then transcript regex
        const dbAge = v.age ? parseInt(String(v.age).trim(), 10) : NaN;
        let ageNum = isNaN(dbAge) ? NaN : dbAge;
        if (isNaN(ageNum)) {
          // "66 years old", "66yo", "66 y/o", "I'm 66", "age 66"
          const ageMatch = transcript.match(/\b(\d{2,3})\s*(?:years?\s*old|yrs?\s*old|y\.?\s*o\.?|y\/o)\b/i)
            || transcript.match(/\b(?:i'?m|im|age|aged)\s+(\d{2,3})\b/i);
          if (ageMatch) ageNum = parseInt(ageMatch[1], 10);
        }
        const ageHardFail = !isNaN(ageNum) && (ageNum < 30 || ageNum > 60);

        // Country check — extracted country must be in the qualified regex.
        // If extraction hasn't run yet, transcript-scan for obvious bad words.
        const dbCountry = (v.country_of_training || '').toLowerCase();
        const NON_QUALIFIED_KEYWORDS = /\b(india|pakistan|bangladesh|sri\s*lanka|nepal|afghanistan|iran|iraq|syria|lebanon|jordan|israel|palestine|saudi\s*arabia|uae|united\s*arab\s*emirates|qatar|kuwait|bahrain|oman|yemen|egypt|sudan|libya|morocco|algeria|tunisia|ethiopia|kenya|uganda|tanzania|nigeria|ghana|cameroon|zimbabwe|zambia|china|north\s*korea|mongolia|taiwan|hong\s*kong|vietnam|thailand|indonesia|malaysia|philippines|myanmar|burma|cambodia|laos|russia|kazakhstan|uzbekistan|turkey|cuba|jamaica|haiti)\b/i;
        const dbCountryHardFail = dbCountry && !CALENDLY_QUALIFIED_COUNTRIES_REGEX.test(dbCountry);
        const transcriptCountryHardFail = !dbCountry && NON_QUALIFIED_KEYWORDS.test(transcript);
        const countryHardFail = dbCountryHardFail || transcriptCountryHardFail;

        if (ageHardFail || countryHardFail) {
          console.log(`widget-save-message: stripping Calendly leak for ${visitorId} (ageHardFail=${ageHardFail}, countryHardFail=${countryHardFail})`);
          // Replace the sentence containing the Calendly URL with a polite closer.
          // Anything before/after that sentence is kept so we don't lose other content.
          cleanedContent = cleanedContent.replace(
            /(?:[^.!?\n]*?https?:\/\/[^\s]*calendly\.com\/\S+[^.!?\n]*[.!?]?)/gi,
            ''
          ).trim();
          if (!cleanedContent) {
            cleanedContent = "Thank you so much for your interest. At the moment, we are working with specific eligibility criteria for the opportunities we handle. We truly appreciate your time and wish you all the best.";
          }
        }
      }
    }

    const { error: insertErr } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id,
      sender_type: senderType,
      content: cleanedContent,
      sequence_number: nextSeq,
    });

    if (insertErr) {
      console.error("widget-save-message: insert failed", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build conversation update payload
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (senderType === "visitor" && conv?.status === "closed") {
      updatePayload.status = "active";
    }

    // Stamp last_visitor_message_at so the cron extraction job picks it up
    if (senderType === "visitor") {
      updatePayload.last_visitor_message_at = new Date().toISOString();
    }

    // Detect when the AI is asking the doctor for their phone number so a cron
    // can send the Calendly fallback if they don't reply within ~1 minute.
    // Heuristic only — keeps a list of common phone-ask phrasings the prompt produces.
    if (senderType === "agent") {
      const text = String(content).toLowerCase();
      const looksLikePhoneAsk =
        /\b(phone|mobile|cell|whatsapp|number)\b/.test(text) &&
        /\b(share|reach|contact|best|grab|what|whats|what's|give|drop|provide)\b/.test(text) &&
        /\?/.test(text);
      if (looksLikePhoneAsk) {
        updatePayload.phone_asked_at = new Date().toISOString();
        updatePayload.phone_followup_sent = false;
      }
    }

    // Hard-stop guard: if the visitor's age is out of range (>60 or <30) or
    // their country of training is non-Western, post the boss's polite closer
    // and tell the frontend to skip the AI for this turn. The chat-ai prompt
    // has the same rule but Sonnet/Haiku don't always obey it on the first
    // turn (especially when the doctor reveals their age in the very first
    // message, before extraction has even run). This is the deterministic
    // safety net.
    const HARD_STOP_CLOSER = "Thank you so much for your interest. At the moment, we are working with specific eligibility criteria for the opportunities we handle. We truly appreciate your time and wish you all the best.";
    let hardStopHandled = false;
    if (senderType === "visitor") {
      // Combine the new message with the recent transcript so we can spot age
      // signals the extractor hasn't processed yet (it runs on a 2-min cron).
      const { data: recentMsgs } = await supabase
        .from("messages")
        .select("content")
        .eq("conversation_id", conversationId)
        .eq("sender_type", "visitor")
        .order("sequence_number", { ascending: false })
        .limit(10);
      const transcript = (recentMsgs || []).map((m: { content: string }) => m.content).join(" ") + " " + String(content);

      const { data: vRow } = await supabase
        .from("visitors")
        .select("country_of_training, age")
        .eq("id", visitorId)
        .maybeSingle();
      const v = (vRow as { country_of_training?: string | null; age?: string | null } | null) || {};

      // Age — DB first, then transcript regex. Skip if the number is followed
      // by a unit (kg/lbs/cm/etc.) to avoid false positives.
      const dbAge = v.age ? parseInt(String(v.age).trim(), 10) : NaN;
      let ageNum = isNaN(dbAge) ? NaN : dbAge;
      if (isNaN(ageNum)) {
        const ageMatch = transcript.match(/\b(\d{1,3})\s*(?:years?\s*old|yrs?\s*old|y\.?\s*o\.?|y\/o)\b/i)
          || transcript.match(/\b(?:i'?m|im|age|aged)\s+(\d{1,3})\b(?!\s*(?:kg|kgs|kilograms?|lbs|pounds?|cm|inches|in|feet|ft|hours?|mins?|minutes?|seconds?|days?|weeks?|months?))/i);
        if (ageMatch) ageNum = parseInt(ageMatch[1], 10);
      }
      const ageHardFail = !isNaN(ageNum) && (ageNum < 30 || ageNum > 60);

      // Country — only trust the DB here. Scanning the transcript for country
      // names is too risky (e.g. "I'm from Pakistan but trained in UK" would
      // false-trigger). DB country is set by the extractor on country_of_training.
      const dbCountry = (v.country_of_training || '').toLowerCase();
      const countryHardFail = !!dbCountry && !CALENDLY_QUALIFIED_COUNTRIES_REGEX.test(dbCountry);

      if (ageHardFail || countryHardFail) {
        // Don't double-post the closer if a previous turn already triggered it.
        const { data: lastAgent } = await supabase
          .from("messages")
          .select("content, sequence_number")
          .eq("conversation_id", conversationId)
          .eq("sender_type", "agent")
          .order("sequence_number", { ascending: false })
          .limit(1)
          .maybeSingle();
        const alreadyClosed = !!lastAgent && /specific eligibility criteria for the opportunities we handle/i.test((lastAgent as { content: string }).content);
        if (!alreadyClosed) {
          const { error: closerErr } = await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: "ai-bot",
            sender_type: "agent",
            content: HARD_STOP_CLOSER,
            sequence_number: nextSeq + 1,
          });
          if (closerErr) {
            console.error("widget-save-message: hard-stop closer insert failed", closerErr);
          } else {
            console.log(`widget-save-message: hard-stop closer posted for ${visitorId} (ageHardFail=${ageHardFail}, countryHardFail=${countryHardFail}, age=${ageNum}, country=${dbCountry})`);
          }
        }
        hardStopHandled = true;
      }
    }

    // If the doctor is *replying* to a phone-number question and the reply
    // looks like a decline, post the Calendly fallback immediately rather than
    // waiting for the 60s silence cron. Mirrors the prompt instructions in
    // chat-ai for the phone-decline path so the booking link is guaranteed.
    let declineCalendlyPosted = false;
    if (senderType === "visitor" && conv?.phone_asked_at && !hardStopHandled) {
      const reply = String(content).toLowerCase().trim();
      const looksLikeDecline =
        /\b(no|nope|nah|n\/a|na|none|skip|pass)\b/.test(reply) ||
        /(rather not|don'?t want|do not want|not comfortable|prefer not|don'?t (wanna|want to)|won'?t share|not (sharing|share|giving))/i.test(reply) ||
        /(later|another time|not now|not yet|maybe later)/i.test(reply);
      if (looksLikeDecline) {
        // Per Mitch: only offer Calendly when ALL three are true:
        //   (1) country_of_training is in a qualified region
        //   (2) phone hasn't been shared yet (Calendly is a phone-fallback)
        //   (3) age is unknown OR within 30-60
        // We compute this inline rather than relying on visitors.qualified,
        // because qualified only flips once BOTH country and age are extracted —
        // so a non-qualified doctor who never shares age would slip through.
        const { data: visitorRow } = await supabase
          .from("visitors")
          .select("country_of_training, age, phone")
          .eq("id", visitorId)
          .maybeSingle();
        const v = (visitorRow as { country_of_training?: string | null; age?: string | null; phone?: string | null } | null) || {};
        const countryOk = !!v.country_of_training && CALENDLY_QUALIFIED_COUNTRIES_REGEX.test(v.country_of_training);
        const phoneNotGiven = !v.phone || /^(n\/a|na|none|unknown|not provided|not available)$/i.test(String(v.phone).trim());
        const ageNum = v.age ? parseInt(String(v.age).trim(), 10) : NaN;
        const ageOk = !v.age || isNaN(ageNum) || (ageNum >= 30 && ageNum <= 60);
        const shouldOffer = countryOk && phoneNotGiven && ageOk;
        if (!shouldOffer) {
          console.log(`widget-save-message: skipping Calendly fallback for ${visitorId} (country=${countryOk}, phoneNotGiven=${phoneNotGiven}, ageOk=${ageOk})`);
          updatePayload.phone_followup_sent = true;
          updatePayload.phone_asked_at = null;
        } else {
        const { data: property } = await supabase
          .from("properties")
          .select("calendly_url")
          .eq("id", conv.property_id)
          .maybeSingle();
        const calendlyUrl = (property as any)?.calendly_url as string | null;
        if (calendlyUrl) {
          const fallbackContent =
            `No problem at all if you'd rather not share your number. You can still book a call at a time that works for you: ${calendlyUrl}`;
          const { error: declineInsertErr } = await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: "ai-bot",
            sender_type: "agent",
            content: fallbackContent,
            sequence_number: nextSeq + 1,
          });
          if (!declineInsertErr) {
            declineCalendlyPosted = true;
            updatePayload.phone_followup_sent = true;
            updatePayload.phone_asked_at = null;
            await supabase
              .from("visitors")
              .update({ booking_call_required: true })
              .eq("id", visitorId);
          } else {
            console.error("widget-save-message: decline-fallback insert failed", declineInsertErr);
          }
        }
        }
      }
    }

    if (aiQueueAction === "queue") {
      updatePayload.ai_queued_at = new Date().toISOString();
      updatePayload.ai_queued_preview = aiQueuePreview ?? null;
      updatePayload.ai_queued_paused = false;
      if (typeof aiQueueWindowMs === "number") {
        updatePayload.ai_queued_window_ms = aiQueueWindowMs;
      }
    } else if (aiQueueAction === "clear") {
      updatePayload.ai_queued_at = null;
      updatePayload.ai_queued_preview = null;
      updatePayload.ai_queued_paused = false;
    }

    // Actually persist the conversation update
    await supabase
      .from("conversations")
      .update(updatePayload)
      .eq("id", conversationId);

    return new Response(JSON.stringify({ success: true, sequence_number: nextSeq, conversationId, conversationCreated, ai_enabled: conv?.ai_enabled !== false, phone_decline_handled: declineCalendlyPosted, hard_stop_handled: hardStopHandled }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("widget-save-message error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

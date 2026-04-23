// Widget bootstrap edge function — consolidated init (visitor + settings + AI agents)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      propertyId,
      sessionId,
      currentPage,
      browserInfo,
      gclid,
    } = await req.json();

    if (!propertyId || !sessionId) {
      return new Response(JSON.stringify({ error: "propertyId and sessionId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Fetch property (all settings + geo) in ONE query ──
    const { data: property, error: propErr } = await supabase
      .from("properties")
      .select("*")
      .eq("id", propertyId)
      .maybeSingle();

    if (propErr || !property) {
      return new Response(JSON.stringify({ error: "Invalid propertyId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Geo-filtering check ──
    const geoMode = property.geo_filter_mode || "anywhere";
    if (geoMode !== "anywhere") {
      const forwardedFor = req.headers.get("x-forwarded-for");
      const realIp = req.headers.get("x-real-ip");
      const ip = forwardedFor?.split(",")[0]?.trim() || realIp || null;

      const isPrivateIp =
        !ip ||
        ip === "127.0.0.1" ||
        ip.startsWith("192.168.") ||
        ip.startsWith("10.") ||
        ip.startsWith("172.");

      if (!isPrivateIp) {
        try {
          const geoResponse = await fetch(
            `http://ip-api.com/json/${ip}?fields=status,region,countryCode`
          );

          if (geoResponse.ok) {
            const geoData = await geoResponse.json();

            if (geoData.status === "success") {
              let blocked = false;

              if (geoMode === "us_only") {
                blocked = geoData.countryCode !== "US";
              } else if (geoMode === "specific_states") {
                const allowedStates: string[] = property.geo_allowed_states || [];
                blocked =
                  geoData.countryCode !== "US" ||
                  !allowedStates.includes(geoData.region);
              }

              if (blocked) {
                const defaultMsg =
                  "We're sorry, our services are currently not available in your area.";
                return new Response(
                  JSON.stringify({
                    geoBlocked: true,
                    geoBlockedMessage: property.geo_blocked_message || defaultMsg,
                  }),
                  {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                  }
                );
              }
            }
          }
        } catch (geoErr) {
          console.error("widget-bootstrap: geo lookup error", geoErr);
        }
      }
    }

    // ── Find or create visitor + find conversation + fetch AI agents in parallel ──
    // Start AI agents fetch in parallel with visitor lookup
    const aiAgentsPromise = (async () => {
      const { data: assignments } = await supabase
        .from("ai_agent_properties")
        .select("ai_agent_id")
        .eq("property_id", propertyId);

      if (!assignments || assignments.length === 0) return [];

      const agentIds = assignments.map((a: { ai_agent_id: string }) => a.ai_agent_id);
      const { data: agents } = await supabase
        .from("ai_agents")
        .select("id, name, avatar_url, personality_prompt")
        .in("id", agentIds)
        .eq("status", "active");

      return agents || [];
    })();

    // Visitor lookup/creation
    let visitorId: string;
    let visitorInfo: { name?: string; email?: string } = {};

    const { data: existingVisitor, error: visitorFindErr } = await supabase
      .from("visitors")
      .select("id,name,email")
      .eq("property_id", propertyId)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (visitorFindErr) {
      console.error("widget-bootstrap: visitor lookup error", visitorFindErr);
    }

    if (existingVisitor?.id) {
      visitorId = existingVisitor.id;
      if (existingVisitor.name) visitorInfo.name = existingVisitor.name;
      if (existingVisitor.email) visitorInfo.email = existingVisitor.email;

      // Best-effort update of the latest page
      supabase
        .from("visitors")
        .update({
          current_page: currentPage ?? null,
          browser_info: browserInfo ?? null,
        })
        .eq("id", visitorId)
        .then(() => {});
    } else {
      const { data: newVisitor, error: createErr } = await supabase
        .from("visitors")
        .insert({
          property_id: propertyId,
          session_id: sessionId,
          current_page: currentPage ?? null,
          browser_info: browserInfo ?? null,
          gclid: gclid ?? null,
        })
        .select("id")
        .single();

      if (createErr || !newVisitor?.id) {
        console.error("widget-bootstrap: failed to create visitor", createErr);
        return new Response(JSON.stringify({ error: "Failed to create visitor" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      visitorId = newVisitor.id;
    }

    // Find most recent conversation + its messages in parallel
    let conversationId: string | null = null;
    let existingMessages: Array<{ id: string; content: string; sender_type: string; sender_id: string; created_at: string; sequence_number: number }> = [];
    let aiEnabled = true;
    let aiQueuedAt: string | null = null;
    let aiQueuedPaused = false;
    let aiQueuedPreview: string | null = null;
    let aiQueuedWindowMs: number | null = null;

    const { data: existingConv, error: convFindErr } = await supabase
      .from("conversations")
      .select("id,status,ai_enabled,ai_queued_at,ai_queued_paused,ai_queued_preview,ai_queued_window_ms")
      .eq("property_id", propertyId)
      .eq("visitor_id", visitorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convFindErr) {
      console.error("widget-bootstrap: conversation lookup error", convFindErr);
    }

    if (existingConv?.id) {
      conversationId = existingConv.id;
      aiEnabled = existingConv.ai_enabled ?? true;
      aiQueuedAt = existingConv.ai_queued_at ?? null;
      aiQueuedPaused = existingConv.ai_queued_paused ?? false;
      aiQueuedPreview = existingConv.ai_queued_preview ?? null;
      aiQueuedWindowMs = existingConv.ai_queued_window_ms ?? null;

      // Fetch messages for this conversation (optimization #4: merged into bootstrap)
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, content, sender_type, sender_id, created_at, sequence_number")
        .eq("conversation_id", conversationId)
        .order("sequence_number", { ascending: true })
        .limit(200);

      existingMessages = msgs || [];
    }

    // Await AI agents (was running in parallel)
    const aiAgents = await aiAgentsPromise;

    // ── Build settings response from the already-fetched property row ──
    const settings = {
      ai_response_delay_min_ms: property.ai_response_delay_min_ms,
      ai_response_delay_max_ms: property.ai_response_delay_max_ms,
      typing_indicator_min_ms: property.typing_indicator_min_ms,
      typing_indicator_max_ms: property.typing_indicator_max_ms,
      smart_typing_enabled: property.smart_typing_enabled,
      typing_wpm: property.typing_wpm,
      max_ai_messages_before_escalation: property.max_ai_messages_before_escalation,
      escalation_keywords: property.escalation_keywords,
      auto_escalation_enabled: property.auto_escalation_enabled,
      require_email_before_chat: property.require_email_before_chat,
      require_name_before_chat: property.require_name_before_chat,
      require_phone_before_chat: property.require_phone_before_chat,
      natural_lead_capture_enabled: property.natural_lead_capture_enabled,
      proactive_message_enabled: property.proactive_message_enabled,
      proactive_message: property.proactive_message,
      proactive_message_delay_seconds: property.proactive_message_delay_seconds,
      greeting: property.greeting,
      ai_base_prompt: property.ai_base_prompt,
      widget_icon: property.widget_icon,
      human_typos_enabled: property.human_typos_enabled,
      drop_capitalization_enabled: property.drop_capitalization_enabled,
      drop_apostrophes_enabled: property.drop_apostrophes_enabled,
      quick_reply_after_first_enabled: property.quick_reply_after_first_enabled,
      calendly_url: property.calendly_url,
      business_phone: property.business_phone,
      business_email: property.business_email,
      business_address: property.business_address,
      business_hours: property.business_hours,
      business_description: property.business_description,
      name: property.name,
    };

    return new Response(JSON.stringify({
      visitorId,
      conversationId,
      visitorInfo,
      greeting: property.greeting || null,
      settings,
      aiAgents,
      // Optimization #4: include messages + conversation state in bootstrap response
      messages: existingMessages,
      aiEnabled,
      aiQueuedAt,
      aiQueuedPaused,
      aiQueuedPreview,
      aiQueuedWindowMs,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("widget-bootstrap error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

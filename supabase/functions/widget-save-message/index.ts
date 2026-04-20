// Widget save message edge function — also handles AI queue state changes
// and auto-creates conversations if needed (merged widget-create-conversation)
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

    // Get conversation state (status + property for AI kill-switch check)
    const { data: conv } = await supabase
      .from("conversations")
      .select("status, ai_enabled, property_id")
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

    const { error: insertErr } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id,
      sender_type: senderType,
      content: String(content),
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

    return new Response(JSON.stringify({ success: true, sequence_number: nextSeq, conversationId, conversationCreated, ai_enabled: conv?.ai_enabled !== false }), {
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

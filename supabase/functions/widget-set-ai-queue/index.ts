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
    const { conversationId, visitorId, sessionId, action, preview, windowMs } = (await req.json()) as {
      conversationId?: string;
      visitorId?: string;
      sessionId?: string;
      /** "queue" | "clear" | "pause" | "resume" */
      action?: string;
      /** Short preview text of the AI response being composed (optional) */
      preview?: string;
      /** Total human-priority window in ms (used by dashboard countdown) */
      windowMs?: number;
    };

    if (!conversationId || !visitorId || !sessionId || !action) {
      return new Response(JSON.stringify({ error: "conversationId, visitorId, sessionId, and action are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validActions = ["queue", "clear", "pause", "resume"];
    if (!validActions.includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate visitor + session (security: prevent spoofing another visitor's queue)
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

    // Verify conversation belongs to this visitor
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id,visitor_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conv || conv.visitor_id !== visitorId) {
      return new Response(JSON.stringify({ error: "Conversation not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build update payload based on action
    let updatePayload: Record<string, unknown>;

    if (action === "queue") {
      updatePayload = {
        ai_queued_at: new Date().toISOString(),
        ai_queued_preview: preview ?? null,
        ai_queued_paused: false,
        ...(typeof windowMs === "number" ? { ai_queued_window_ms: windowMs } : {}),
      };
    } else if (action === "clear") {
      updatePayload = {
        ai_queued_at: null,
        ai_queued_preview: null,
        ai_queued_paused: false,
      };
    } else if (action === "pause") {
      updatePayload = { ai_queued_paused: true };
    } else {
      // resume
      updatePayload = { ai_queued_paused: false };
    }

    const { error: updateErr } = await supabase
      .from("conversations")
      .update(updatePayload)
      .eq("id", conversationId);

    if (updateErr) {
      console.error("widget-set-ai-queue: update failed", updateErr);
      return new Response(JSON.stringify({ error: "Failed to update queue state" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, action }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("widget-set-ai-queue error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

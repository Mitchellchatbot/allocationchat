import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PresenceStatus = "active" | "closed";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { propertyId, visitorId, sessionId, status } = (await req.json()) as {
      propertyId?: string;
      visitorId?: string;
      sessionId?: string;
      status?: PresenceStatus;
    };

    if (!propertyId || !visitorId || !sessionId || !status) {
      return new Response(JSON.stringify({ error: "propertyId, visitorId, sessionId, and status are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (status !== "active" && status !== "closed") {
      return new Response(JSON.stringify({ error: "Invalid status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate visitor + session + property.
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

    // Find the most recent conversation for this visitor/property.
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id,status")
      .eq("property_id", propertyId)
      .eq("visitor_id", visitorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convErr) {
      console.error("widget-conversation-presence: conversation lookup error", convErr);
    }

    if (!conv?.id) {
      // No conversation yet (visitor hasn't sent a message) — nothing to update.
      return new Response(JSON.stringify({ ok: true, conversationId: null, updated: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nextStatus: PresenceStatus = status === "closed" ? "closed" : "active";

    // Avoid unnecessary writes for closing an already-closed conversation,
    // but still allow frequent "active" pings (updates updated_at).
    const shouldWrite = nextStatus === "active" || String(conv.status) !== "closed";

    if (!shouldWrite) {
      return new Response(JSON.stringify({ ok: true, conversationId: conv.id, updated: false, status: "closed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("conversations")
      .update({ status: nextStatus, updated_at: now })
      .eq("id", conv.id);

    if (updateErr) {
      console.error("widget-conversation-presence: update failed", updateErr);
      return new Response(JSON.stringify({ error: "Failed to update conversation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, conversationId: conv.id, updated: true, status: nextStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("widget-conversation-presence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

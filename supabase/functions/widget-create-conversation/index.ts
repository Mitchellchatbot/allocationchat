// Widget create conversation edge function
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
    const { propertyId, visitorId, sessionId } = await req.json();

    if (!propertyId || !visitorId || !sessionId) {
      return new Response(JSON.stringify({ error: "propertyId, visitorId, and sessionId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate visitor exists and belongs to the session
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

    // Check property-level AI kill switch
    const { data: property } = await supabase
      .from("properties")
      .select("ai_enabled")
      .eq("id", propertyId)
      .maybeSingle();
    const propertyAiEnabled = property?.ai_enabled !== false;

    // Check if there's already an open conversation
    const { data: existingConv, error: convFindErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("property_id", propertyId)
      .eq("visitor_id", visitorId)
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convFindErr) {
      console.error("widget-create-conversation: conversation lookup error", convFindErr);
    }

    if (existingConv?.id) {
      // Return existing conversation
      return new Response(JSON.stringify({ conversationId: existingConv.id, created: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new conversation — inherit AI status from property setting
    const { data: newConv, error: convCreateErr } = await supabase
      .from("conversations")
      .insert({
        property_id: propertyId,
        visitor_id: visitorId,
        status: "active",
        ai_enabled: propertyAiEnabled,
      })
      .select("id")
      .single();

    if (convCreateErr || !newConv?.id) {
      console.error("widget-create-conversation: failed to create conversation", convCreateErr);
      return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fire email + Slack notifications (non-blocking)
    const notifyPayload = JSON.stringify({
      propertyId,
      eventType: "new_conversation",
      conversationId: newConv.id,
    });
    const notifyHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
    };

    fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
      method: "POST",
      headers: notifyHeaders,
      body: notifyPayload,
    }).catch((err) => console.error("Email notification error:", err));

    fetch(`${supabaseUrl}/functions/v1/send-slack-notification`, {
      method: "POST",
      headers: notifyHeaders,
      body: notifyPayload,
    }).catch((err) => console.error("Slack notification error:", err));

    fetch(`${supabaseUrl}/functions/v1/send-google-chat-notification`, {
      method: "POST",
      headers: notifyHeaders,
      body: notifyPayload,
    }).catch((err) => console.error("Google Chat notification error:", err));

    return new Response(JSON.stringify({ conversationId: newConv.id, created: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("widget-create-conversation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

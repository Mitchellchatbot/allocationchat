import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoogleChatNotificationRequest {
  propertyId: string;
  eventType: "new_conversation" | "phone_submission" | "insurance_submission";
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  conversationId: string;
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { propertyId, eventType, visitorName, visitorEmail, visitorPhone, conversationId, message }
      : GoogleChatNotificationRequest = await req.json();

    if (!propertyId || !eventType || !conversationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: settings } = await supabase
      .from("google_chat_notification_settings")
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle();

    if (!settings?.enabled || !settings.webhook_url) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "disabled_or_not_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (eventType === "new_conversation" && !settings.notify_on_new_conversation) {
      return new Response(JSON.stringify({ skipped: true, reason: "event_disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (eventType === "phone_submission" && !settings.notify_on_phone_submission) {
      return new Response(JSON.stringify({ skipped: true, reason: "event_disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (eventType === "insurance_submission" && !settings.notify_on_insurance_submission) {
      return new Response(JSON.stringify({ skipped: true, reason: "event_disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: property } = await supabase
      .from("properties")
      .select("name, domain")
      .eq("id", propertyId)
      .single();

    const propertyName = property?.name || "Your Property";
    const propertyDomain = property?.domain || "";
    const visitorLabel = visitorName || visitorEmail || "Anonymous Visitor";

    let headerTitle = "💬 New Conversation";
    let eventDetail = "New chat started";
    if (eventType === "phone_submission") {
      headerTitle = "📞 Phone Number Captured";
      eventDetail = `Phone: ${visitorPhone || "N/A"}`;
    } else if (eventType === "insurance_submission") {
      headerTitle = "🏥 Insurance Info Submitted";
      eventDetail = "Visitor provided insurance details";
    }

    const conversationUrl = `https://care-assist.io/dashboard?conversation=${conversationId}`;

    const widgets: any[] = [
      { decoratedText: { topLabel: "Property", text: propertyName } },
      { decoratedText: { topLabel: "Domain", text: propertyDomain } },
      { decoratedText: { topLabel: "Visitor", text: visitorLabel } },
      { decoratedText: { topLabel: "Event", text: eventDetail } },
    ];

    if (message) {
      widgets.push({
        decoratedText: {
          topLabel: "Last message",
          text: message.slice(0, 400),
          wrapText: true,
        },
      });
    }

    widgets.push({
      buttonList: {
        buttons: [{
          text: "View Conversation",
          onClick: { openLink: { url: conversationUrl } },
        }],
      },
    });

    const payload = {
      cardsV2: [{
        cardId: "care-assist-notification",
        card: {
          header: {
            title: headerTitle,
            subtitle: `care-assist.io · ${conversationId.slice(0, 8)}…`,
          },
          sections: [{ widgets }],
        },
      }],
    };

    const res = await fetch(settings.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const resText = await res.text();
    console.log(`[send-google-chat-notification] status=${res.status}`, resText.slice(0, 200));

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Google Chat webhook error: ${res.status}`, detail: resText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-google-chat-notification]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

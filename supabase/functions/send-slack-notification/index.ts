import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SlackNotificationRequest {
  propertyId: string;
  eventType: "new_conversation" | "escalation" | "phone_submission";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const {
      propertyId,
      eventType,
      visitorName,
      visitorEmail,
      visitorPhone,
      conversationId,
      message,
    }: SlackNotificationRequest = await req.json();

    if (!propertyId || !eventType || !conversationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Slack notification settings for this property
    const { data: settings, error: settingsErr } = await supabase
      .from("slack_notification_settings")
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle();

    if (settingsErr) {
      console.error("Error fetching Slack settings:", settingsErr);
      return new Response(
        JSON.stringify({ error: "Failed to fetch settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no settings, not enabled, or no webhook — skip silently
    if (!settings || !settings.enabled) {
      console.log("Slack notifications disabled for property:", propertyId);
      return new Response(
        JSON.stringify({ skipped: true, reason: "disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Need either a webhook URL or an access token + channel
    const webhookUrl = settings.incoming_webhook_url || settings.legacy_webhook_url;
    const accessToken = settings.access_token;

    if (!webhookUrl && !accessToken) {
      console.log("No Slack delivery method configured for property:", propertyId);
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_delivery_method" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this event type should trigger a notification
    if (eventType === "new_conversation" && !settings.notify_on_new_conversation) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "event_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (eventType === "escalation" && !settings.notify_on_escalation) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "event_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (eventType === "phone_submission" && !settings.notify_on_phone_submission) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "event_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch property name
    const { data: property } = await supabase
      .from("properties")
      .select("name, domain")
      .eq("id", propertyId)
      .single();

    const propertyName = property?.name || "Your Property";
    const propertyDomain = property?.domain || "";
    const isEscalation = eventType === "escalation";
    const isPhoneSubmission = eventType === "phone_submission";
    const visitorLabel = visitorName || visitorEmail || "Anonymous Visitor";

    // Build Slack message blocks
    let headerText = "💬 New Conversation";
    let eventDetail = "New chat started";
    if (isEscalation) {
      headerText = "🔴 Conversation Escalated";
      eventDetail = "Escalation — needs human agent";
    } else if (isPhoneSubmission) {
      headerText = "📞 Phone Number Captured";
      eventDetail = `Phone: ${visitorPhone || "N/A"}`;
    }

    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: headerText,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Property:*\n${propertyName}` },
          { type: "mrkdwn", text: `*Domain:*\n${propertyDomain}` },
          { type: "mrkdwn", text: `*Visitor:*\n${visitorLabel}` },
          {
            type: "mrkdwn",
            text: `*Event:*\n${eventDetail}`,
          },
        ],
      },
    ];

    if (message) {
      blocks.push({
        type: "section",
        fields: [],
        text: {
          type: "mrkdwn",
          text: `*Last message:*\n> ${message.slice(0, 500)}`,
        },
      } as any);
    }

    // Add a "View Conversation" button
    const appBaseUrl = "https://care-assist.io";
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View Conversation", emoji: true },
          url: `${appBaseUrl}/dashboard?conversation=${conversationId}`,
          style: "primary",
        },
      ],
    } as any);

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `ScaledBot · Conversation ID: \`${conversationId.slice(0, 8)}…\``,
        },
      ],
    } as any);

    let fallbackText = `💬 New conversation on ${propertyName} — ${visitorLabel}`;
    if (isEscalation) {
      fallbackText = `🔴 Escalation on ${propertyName} — ${visitorLabel}`;
    } else if (isPhoneSubmission) {
      fallbackText = `📞 Phone captured on ${propertyName} — ${visitorLabel}: ${visitorPhone || "N/A"}`;
    }

    const payload = {
      text: fallbackText,
      blocks,
    };

    // Send via webhook or API
    let slackResponse: Response;
    if (webhookUrl) {
      slackResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      // Use chat.postMessage with the access token
      const channel =
        settings.incoming_webhook_channel ||
        settings.channel_name ||
        "general";

      slackResponse = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          channel,
          ...payload,
        }),
      });
    }

    const responseText = await slackResponse.text();
    console.log("Slack notification sent:", slackResponse.status, responseText);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-slack-notification error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

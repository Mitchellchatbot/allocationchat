import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { propertyId, eventType, visitorName, visitorEmail, visitorPhone, conversationId, message }: NotificationRequest = await req.json();

    if (!propertyId || !eventType || !conversationId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch email notification settings for this property
    const { data: settings, error: settingsErr } = await supabase
      .from("email_notification_settings")
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle();

    if (settingsErr) {
      console.error("Error fetching email settings:", settingsErr);
      return new Response(JSON.stringify({ error: "Failed to fetch settings" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no settings, not enabled, or no recipients — skip silently
    if (!settings || !settings.enabled) {
      console.log("Email notifications disabled for property:", propertyId);
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients: string[] = settings.notification_emails || [];
    if (recipients.length === 0) {
      console.log("No email recipients configured for property:", propertyId);
      return new Response(JSON.stringify({ skipped: true, reason: "no_recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this event type should trigger a notification
    if (eventType === "new_conversation" && !settings.notify_on_new_conversation) {
      return new Response(JSON.stringify({ skipped: true, reason: "event_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (eventType === "escalation" && !settings.notify_on_escalation) {
      return new Response(JSON.stringify({ skipped: true, reason: "event_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (eventType === "phone_submission" && !settings.notify_on_phone_submission) {
      return new Response(JSON.stringify({ skipped: true, reason: "event_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch property name for the email
    const { data: property } = await supabase
      .from("properties")
      .select("name, domain")
      .eq("id", propertyId)
      .single();

    const propertyName = property?.name || "Your Property";
    const propertyDomain = property?.domain || "";

    // Build email content
    const isEscalation = eventType === "escalation";
    const isPhoneSubmission = eventType === "phone_submission";
    
    let subject: string;
    if (isEscalation) {
      subject = `🔴 Escalation Alert — ${propertyName}`;
    } else if (isPhoneSubmission) {
      subject = `📞 Phone Number Captured — ${propertyName}`;
    } else {
      subject = `💬 New Conversation — ${propertyName}`;
    }

    const visitorLabel = visitorName || visitorEmail || "Anonymous Visitor";
    const messagePreview = message ? `<p style="background:#f5f5f5;border-radius:8px;padding:12px;color:#555;font-style:italic;">"${message.slice(0, 300)}"</p>` : "";

    let bannerGradient: string;
    let bannerBorder: string;
    let bannerColor: string;
    let bannerTitle: string;
    let bannerDescription: string;

    if (isEscalation) {
      bannerGradient = "linear-gradient(135deg,#fef2f2,#fee2e2)";
      bannerBorder = "#ef4444";
      bannerColor = "#dc2626";
      bannerTitle = "Conversation Escalated";
      bannerDescription = "A visitor conversation requires human attention.";
    } else if (isPhoneSubmission) {
      bannerGradient = "linear-gradient(135deg,#f0fdf4,#dcfce7)";
      bannerBorder = "#22c55e";
      bannerColor = "#16a34a";
      bannerTitle = "Phone Number Captured";
      bannerDescription = "A visitor shared their phone number during chat.";
    } else {
      bannerGradient = "linear-gradient(135deg,#f0fdf4,#dcfce7)";
      bannerBorder = "#22c55e";
      bannerColor = "#16a34a";
      bannerTitle = "New Conversation Started";
      bannerDescription = "A visitor has started a new chat on your website.";
    }

    const phoneRow = visitorPhone
      ? `<tr><td style="padding:8px 0;color:#888;width:120px;">Phone</td><td style="padding:8px 0;font-weight:600;">${visitorPhone}</td></tr>`
      : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#F97316;margin:0;">Care Assist</h1>
        </div>

        <div style="background:${bannerGradient};border-radius:12px;padding:24px;margin-bottom:20px;border-left:4px solid ${bannerBorder};">
          <h2 style="margin:0 0 8px;color:${bannerColor};">
            ${bannerTitle}
          </h2>
          <p style="margin:0;color:#555;">
            ${bannerDescription}
          </p>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr>
            <td style="padding:8px 0;color:#888;width:120px;">Visitor</td>
            <td style="padding:8px 0;font-weight:600;">${visitorLabel}</td>
          </tr>
          ${phoneRow}
          <tr>
            <td style="padding:8px 0;color:#888;">Property</td>
            <td style="padding:8px 0;">${propertyName} (${propertyDomain})</td>
          </tr>
        </table>

        ${messagePreview}

        <p style="color:#999;font-size:12px;text-align:center;margin-top:24px;">
          Care Assist — Compassionate support, one conversation at a time.
        </p>
      </body>
      </html>
    `;

    const resend = new Resend(resendApiKey);
    const emailResponse = await resend.emails.send({
      from: "Care Assist <notifications@care-assist.io>",
      to: recipients,
      subject,
      html,
      reply_to: "support@care-assist.io",
    });

    console.log("Email notification sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-email-notification error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, fullName }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error("Missing email");
    }

    const firstName = fullName?.split(" ")[0] || "there";

    console.log(`Sending welcome email to ${email} (${firstName})`);

    // Generate a confirmation link so the welcome email doubles as the confirmation email
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email,
      options: {
        redirectTo: "https://care-assist.io/auth",
      },
    });

    const confirmationLink = linkData?.properties?.action_link;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Care Assist <welcome@care-assist.io>",
      reply_to: "support@care-assist.io",
      to: [email],
      subject: `Welcome to Care Assist, ${firstName}! 🎉`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #F97316, #ea580c);padding:40px 40px 32px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:12px;padding:12px 16px;margin-bottom:16px;">
                <span style="font-size:28px;">💬</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">
                Welcome to Care Assist
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">
                You're all set to start capturing more leads
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px;color:#1a1a1a;font-size:16px;line-height:1.6;">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 24px;color:#4a4a4a;font-size:15px;line-height:1.7;">
                Thanks for signing up! Care Assist helps treatment centers engage visitors 24/7 with AI-powered chat that captures leads naturally and stays HIPAA compliant.
              </p>
              
              <!-- Steps -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 16px;background:#FFF7ED;border-radius:12px;margin-bottom:8px;">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="vertical-align:top;padding-right:12px;">
                        <div style="width:28px;height:28px;background:#F97316;border-radius:50%;color:#fff;text-align:center;line-height:28px;font-weight:700;font-size:13px;">1</div>
                      </td>
                      <td>
                        <p style="margin:0;color:#1a1a1a;font-size:14px;font-weight:600;">Set up your property</p>
                        <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Add your website domain and customize the chat widget</p>
                      </td>
                    </tr></table>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:14px 16px;background:#FFF7ED;border-radius:12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="vertical-align:top;padding-right:12px;">
                        <div style="width:28px;height:28px;background:#F97316;border-radius:50%;color:#fff;text-align:center;line-height:28px;font-weight:700;font-size:13px;">2</div>
                      </td>
                      <td>
                        <p style="margin:0;color:#1a1a1a;font-size:14px;font-weight:600;">Configure your AI agent</p>
                        <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Train your AI to answer questions specific to your facility</p>
                      </td>
                    </tr></table>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:14px 16px;background:#FFF7ED;border-radius:12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="vertical-align:top;padding-right:12px;">
                        <div style="width:28px;height:28px;background:#F97316;border-radius:50%;color:#fff;text-align:center;line-height:28px;font-weight:700;font-size:13px;">3</div>
                      </td>
                      <td>
                        <p style="margin:0;color:#1a1a1a;font-size:14px;font-weight:600;">Embed & go live</p>
                        <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Add one line of code to your website and start capturing leads</p>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${confirmationLink ?? 'https://care-assist.io/auth'}" style="display:inline-block;background:#F97316;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;box-shadow:0 4px 12px rgba(249,115,22,0.3);">
                      Confirm Email & Go to Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
                Need help getting started? Just reply to this email.
              </p>
              <p style="margin:12px 0 0;color:#d1d5db;font-size:12px;">
                © ${new Date().getFullYear()} Care Assist · All rights reserved
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw new Error(emailError.message || "Failed to send welcome email");
    }

    console.log("Welcome email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      throw new Error("Missing email");
    }

    console.log(`Password reset requested for: ${email}`);

    // Use admin client to generate the reset link
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Determine the app origin from the request headers
    const origin = req.headers.get("origin") || "https://care-assist.io";
    const redirectTo = `${origin}/auth/reset-password`;

    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo,
      },
    });

    if (linkError) {
      console.error("Error generating reset link:", linkError);
      // Don't reveal if email exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email has been sent." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      console.error("No action link returned");
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email has been sent." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Look up the user's name for personalization
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("email", email)
      .maybeSingle();

    const firstName = profile?.full_name?.split(" ")[0] || "there";

    console.log(`Sending branded password reset email to ${email}`);

    const emailResponse = await resend.emails.send({
      from: "Care Assist <noreply@care-assist.io>",
      reply_to: "support@care-assist.io",
      to: [email],
      subject: "Reset your password",
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
                <span style="font-size:28px;">🔐</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">
                Reset Your Password
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">
                We received a request to reset your password
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
                We received a request to reset your password for your Care Assist account. Click the button below to set a new password.
              </p>
              
              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${actionLink}" style="display:inline-block;background:#F97316;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;box-shadow:0 4px 12px rgba(249,115,22,0.3);">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6;">
                This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
              </p>
              
              <div style="padding:14px 16px;background:#FFF7ED;border-radius:12px;">
                <p style="margin:0;color:#9a3412;font-size:13px;line-height:1.5;">
                  <strong>Security tip:</strong> Never share this link with anyone. Care Assist will never ask you for your password.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
                Need help? Just reply to this email.
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

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw new Error("Failed to send email");
    }

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "If an account exists, a reset email has been sent." }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("Error in send-password-reset:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
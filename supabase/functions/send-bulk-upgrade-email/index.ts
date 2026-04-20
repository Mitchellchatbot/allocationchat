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
    const { testEmail } = await req.json().catch(() => ({}));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let profiles: { user_id: string; email: string; full_name: string | null }[];

    if (testEmail) {
      // Test mode: only send to the specified email
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("email", testEmail)
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: `No profile found for ${testEmail}` }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
      profiles = [data];
    } else {
      // Bulk mode: fetch all profiles
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, full_name");

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch profiles" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
      profiles = data;
    }

    console.log(`Sending upgrade emails to ${profiles.length} user(s)`);

    const results: { sent: string[]; errors: { email: string; error: string }[] } = {
      sent: [],
      errors: [],
    };

    for (const profile of profiles) {
      try {
        // Generate a magic link so the user can log in without needing their old password
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: profile.email,
          options: {
            redirectTo: "https://care-assist.io/auth/reset-password",
          },
        });

        if (linkError || !linkData?.properties?.action_link) {
          console.error(`Failed to generate magic link for ${profile.email}:`, linkError);
          results.errors.push({ email: profile.email, error: linkError?.message ?? "No link returned" });
          continue;
        }

        const magicLink = linkData.properties.action_link;
        const firstName = profile.full_name?.split(" ")[0] || "there";

        const emailResponse = await resend.emails.send({
          from: "Care Assist <noreply@care-assist.io>",
          reply_to: "support@care-assist.io",
          to: [profile.email],
          subject: "We've Leveled Up — Log In to Care Assist",
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
                <span style="font-size:28px;">🚀</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">
                We've Leveled Up!
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">
                A faster, more secure Care Assist awaits
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px;color:#1a1a1a;font-size:16px;line-height:1.6;">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 20px;color:#4a4a4a;font-size:15px;line-height:1.7;">
                To provide you with a faster and more secure experience, we've successfully upgraded our backend systems. As part of this enhancement, we've refreshed your account security.
              </p>

              <p style="margin:0 0 12px;color:#1a1a1a;font-size:15px;font-weight:700;line-height:1.6;">
                What this means for you:
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:12px 16px;background:#FFF7ED;border-radius:12px;margin-bottom:10px;">
                    <p style="margin:0 0 6px;color:#1a1a1a;font-size:14px;font-weight:700;">🔑 New Secure Password</p>
                    <p style="margin:0;color:#4a4a4a;font-size:14px;line-height:1.6;">We've generated a login link to get into your account and change your password.</p>
                  </td>
                </tr>
                <tr><td style="height:10px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background:#FFF7ED;border-radius:12px;">
                    <p style="margin:0 0 6px;color:#1a1a1a;font-size:14px;font-weight:700;">✅ Next Steps</p>
                    <p style="margin:0;color:#4a4a4a;font-size:14px;line-height:1.6;">You can use this to log in right now! For your peace of mind, we recommend hopping into your settings to update it to something personal and memorable as soon as you can.</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${magicLink}" style="display:inline-block;background:#F97316;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;box-shadow:0 4px 12px rgba(249,115,22,0.3);">
                      Log In Now →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#4a4a4a;font-size:15px;line-height:1.7;">
                Thank you for being part of the Care-Assist community as we continue to improve.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
                Need help? Just reply to this email or reach us at support@care-assist.io
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
          console.error(`Resend error for ${profile.email}:`, emailResponse.error);
          results.errors.push({ email: profile.email, error: emailResponse.error.message });
        } else {
          console.log(`Upgrade email sent to ${profile.email}`);
          results.sent.push(profile.email);
        }
      } catch (err: any) {
        console.error(`Unexpected error for ${profile.email}:`, err);
        results.errors.push({ email: profile.email, error: err.message });
      }

      // Small delay to stay within Resend rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const summary = {
      total: profiles.length,
      sent: results.sent.length,
      errors: results.errors.length,
      details: results,
    };

    console.log("Upgrade email send complete:", summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-bulk-upgrade-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  agentId: string;
  agentName: string;
  agentEmail: string;
  inviterName: string;
  appUrl: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const callerUserId = userData.user.id;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { agentId, agentName, agentEmail, inviterName, appUrl }: InvitationRequest = await req.json();

    // --- Authorization: Verify caller owns the agent (invited_by) ---
    const { data: agentRecord, error: agentError } = await supabase
      .from("agents")
      .select("invited_by")
      .eq("id", agentId)
      .single();

    if (agentError || !agentRecord) {
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (agentRecord.invited_by !== callerUserId) {
      console.error("Forbidden: caller did not invite this agent");
      return new Response(
        JSON.stringify({ error: "Forbidden: you did not create this agent" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending invitation to:", agentEmail, "from:", inviterName, "by user:", callerUserId);

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Update agent record with token
    const { error: updateError } = await supabase
      .from("agents")
      .update({
        invitation_token: invitationToken,
        invitation_expires_at: expiresAt.toISOString(),
      })
      .eq("id", agentId);

    if (updateError) {
      console.error("Error updating agent with token:", updateError);
      throw new Error("Failed to generate invitation token");
    }

    // Create signup URL with token
    const signupUrl = `${appUrl}/auth?invite=${invitationToken}`;

    // Send invitation email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Care Assist <invitations@care-assist.io>",
        to: [agentEmail],
        subject: `${inviterName} invited you to join their team on Care Assist`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #F97316; margin: 0;">Care Assist</h1>
              <p style="color: #666; margin-top: 5px;">Compassionate support, one conversation at a time</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
              <h2 style="margin-top: 0; color: #333;">Hi ${agentName}!</h2>
              <p style="font-size: 16px; color: #555;">
                <strong>${inviterName}</strong> has invited you to join their team as a support agent on Care Assist.
              </p>
              <p style="color: #666;">
                As a team member, you'll be able to respond to live chat conversations and help visitors get the support they need.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #F97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Accept Invitation & Create Account
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center;">
              This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              Care Assist - Helping treatment centers connect with those who need support.
            </p>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      
      // Check for domain verification error
      if (errorData.statusCode === 403 && errorData.message?.includes('verify a domain')) {
        throw new Error(
          "Resend is in test mode. To send invitations to other people, verify your domain at resend.com/domains. For testing, you can only send to your own email."
        );
      }
      
      throw new Error(errorData.message || "Failed to send email");
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResult.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-agent-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

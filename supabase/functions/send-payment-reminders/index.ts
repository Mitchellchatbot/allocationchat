import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildReminderHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#F97316 0%,#ea580c 100%);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">Care Assist</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Payment Required</p>
    </div>
    <div style="background:white;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
      <h2 style="color:#1a1a1a;margin:0 0 16px;font-size:20px;">Hi ${firstName},</h2>
      <p style="color:#4b5563;line-height:1.6;margin:0 0 16px;">
        Your Care Assist subscription payment is overdue. To avoid any interruption to your service, please update your payment method as soon as possible.
      </p>
      <p style="color:#4b5563;line-height:1.6;margin:0 0 24px;">
        Your account access is currently restricted until the outstanding balance is settled.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="https://care-assist.io/dashboard/subscription"
           style="background:linear-gradient(135deg,#F97316 0%,#ea580c 100%);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
          Update Payment Method
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:24px 0 0;">
        Questions? Reply to this email or contact <a href="mailto:support@care-assist.io" style="color:#F97316;">support@care-assist.io</a>.
      </p>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin:16px 0 0;">
      © ${new Date().getFullYear()} Care Assist. All rights reserved.
    </p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (!stripeKey || !resendKey) {
    return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY or RESEND_API_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const resend = new Resend(resendKey);

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const targetUserId: string | null = body.userId || null;

    // If targeting a single user, send immediately (bypass cooldown)
    if (targetUserId) {
      const { data: localSub } = await supabase
        .from("subscriptions")
        .select("user_id, is_comped, stripe_customer_id")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (!localSub || localSub.is_comped) {
        return new Response(JSON.stringify({ error: "User not found or is comped" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (!profile?.email) {
        return new Response(JSON.stringify({ error: "User profile not found" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const firstName = profile.full_name?.split(" ")[0] || "there";
      const { error: emailError } = await resend.emails.send({
        from: "Care Assist <notifications@care-assist.io>",
        reply_to: "support@care-assist.io",
        to: [profile.email],
        subject: "Action required: your Care Assist payment is overdue",
        html: buildReminderHtml(firstName),
      });

      if (emailError) {
        return new Response(JSON.stringify({ error: emailError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("subscriptions")
        .update({ last_payment_reminder_at: new Date().toISOString() })
        .eq("user_id", targetUserId);

      return new Response(JSON.stringify({ sent: 1 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all overdue subscriptions from Stripe (past_due + incomplete)
    const [pastDueResult, incompleteResult] = await Promise.all([
      stripe.subscriptions.list({ status: "past_due", limit: 100 }),
      stripe.subscriptions.list({ status: "incomplete", limit: 100 }),
    ]);

    // Also find locally-expired trials that are still "trialing" in Stripe
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: expiredTrials } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, user_id, is_comped, last_payment_reminder_at")
      .eq("is_comped", false)
      .eq("status", "trialing")
      .lt("trial_ends_at", new Date().toISOString())
      .not("stripe_customer_id", "is", null);

    // Build deduplicated list by stripe_customer_id
    const seen = new Set<string>();
    const allOverdue: { customerId: string; source: "stripe" | "local" }[] = [];

    for (const sub of [...pastDueResult.data, ...incompleteResult.data]) {
      const cid = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      if (!seen.has(cid)) { seen.add(cid); allOverdue.push({ customerId: cid, source: "stripe" }); }
    }
    for (const sub of expiredTrials || []) {
      if (sub.stripe_customer_id && !seen.has(sub.stripe_customer_id)) {
        seen.add(sub.stripe_customer_id);
        allOverdue.push({ customerId: sub.stripe_customer_id, source: "local" });
      }
    }

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const { customerId } of allOverdue) {
      const stripeSub = [...pastDueResult.data, ...incompleteResult.data]
        .find(s => (typeof s.customer === "string" ? s.customer : s.customer.id) === customerId);
      try {
        // Find user in our subscriptions table by stripe_customer_id
        const { data: localSub } = await supabase
          .from("subscriptions")
          .select("user_id, is_comped, last_payment_reminder_at")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (!localSub) {
          skipped++;
          continue;
        }

        // Skip comped accounts
        if (localSub.is_comped) {
          skipped++;
          continue;
        }

        // Skip if reminded within the last 3 days
        if (localSub.last_payment_reminder_at) {
          const lastSent = new Date(localSub.last_payment_reminder_at).getTime();
          const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
          if (lastSent > threeDaysAgo) {
            skipped++;
            continue;
          }
        }

        // Get user email from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", localSub.user_id)
          .maybeSingle();

        if (!profile?.email) {
          skipped++;
          continue;
        }

        const firstName = profile.full_name?.split(" ")[0] || "there";

        // Send reminder email
        const { error: emailError } = await resend.emails.send({
          from: "Care Assist <notifications@care-assist.io>",
          reply_to: "support@care-assist.io",
          to: [profile.email],
          subject: "Action required: your Care Assist payment is overdue",
          html: buildReminderHtml(firstName),
        });

        if (emailError) {
          errors.push(`Failed to send to ${profile.email}: ${emailError.message}`);
          continue;
        }

        // Update last_payment_reminder_at
        await supabase
          .from("subscriptions")
          .update({ last_payment_reminder_at: new Date().toISOString() })
          .eq("user_id", localSub.user_id);

        // Also sync past_due status to local DB
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("user_id", localSub.user_id);

        console.log(`Sent payment reminder to ${profile.email}`);
        sent++;
      } catch (err) {
        errors.push(`Error processing sub ${stripeSub.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return new Response(JSON.stringify({ sent, skipped, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SEND-PAYMENT-REMINDERS] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

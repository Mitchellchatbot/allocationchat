import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const user = userData.user;

    // Check local subscription record first
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // If comped, return immediately
    if (sub?.is_comped) {
      return new Response(JSON.stringify({
        subscribed: true,
        status: "comped",
        plan_id: sub.plan_id || "enterprise",
        is_comped: true,
        trial_ends_at: sub.trial_ends_at,
        current_period_end: sub.current_period_end,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For trialing users, still check Stripe to see if they've chosen a plan
    // (don't return early — fall through to Stripe check below)

    // Check Stripe for active subscription
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    if (!user.email) {
      return new Response(JSON.stringify({ subscribed: false, status: "no_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PRODUCT_MAP: Record<string, string> = {
      "prod_UAlKXnxdRG1Rgt": "basic",
      "prod_UAlMpsN43Fccjn": "professional",
      "prod_UAlQyKMRVwLzDL": "enterprise",
    };

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      // If still in local trial period, return trialing
      const trialEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;
      const trialStillActive = trialEnd && !isNaN(trialEnd.getTime()) && trialEnd > new Date();

      if (sub?.status === "trialing" && trialStillActive) {
        return new Response(JSON.stringify({
          subscribed: true,
          status: "trialing",
          plan_id: sub.plan_id,
          is_comped: false,
          trial_ends_at: sub.trial_ends_at,
          current_period_end: null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Trial expired with no Stripe customer
      if (sub && sub.status === "trialing") {
        await supabase.from("subscriptions").update({ status: "canceled" }).eq("user_id", user.id);
      }
      return new Response(JSON.stringify({
        subscribed: false,
        status: sub?.status === "trialing" ? "trial_expired" : "no_subscription",
        plan_id: null,
        trial_ends_at: sub?.trial_ends_at || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    // Also check trialing subscriptions in Stripe
    let activeSub = subscriptions.data[0];
    if (!activeSub) {
      const trialingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 1,
      });
      const stripeTrial = trialingSubs.data[0];
      // Only treat as active-trialing if our local trial hasn't expired yet
      const localTrialEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;
      const localTrialActive = localTrialEnd && localTrialEnd > new Date();
      if (stripeTrial && localTrialActive) {
        activeSub = stripeTrial;
      }
      // If Stripe says trialing but local trial is expired → fall through to past_due check
    }

    // Also check past_due and incomplete subscriptions (e.g. trial ended, no payment method)
    if (!activeSub) {
      // Check past_due then incomplete (trial ended with no payment method)
      const pastDueSubs = await stripe.subscriptions.list({ customer: customerId, status: "past_due", limit: 1 });
      const incompleteSubs = !pastDueSubs.data[0]
        ? await stripe.subscriptions.list({ customer: customerId, status: "incomplete", limit: 1 })
        : { data: [] };
      const overdueStripe = pastDueSubs.data[0] || incompleteSubs.data[0];
      if (overdueStripe) {
        const pd = overdueStripe;
        const productId = pd.items.data[0]?.price?.product as string;
        const planId = PRODUCT_MAP[productId] || null;
        let periodEnd: string | null = null;
        try { const ts = (pd as any).current_period_end; if (ts) periodEnd = new Date(ts * 1000).toISOString(); } catch { /* ignore */ }
        await supabase.from("subscriptions").upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: pd.id,
          plan_id: planId,
          status: "past_due",
          current_period_end: periodEnd,
        }, { onConflict: "user_id" });
        return new Response(JSON.stringify({
          subscribed: false,
          status: "past_due",
          plan_id: planId,
          is_comped: false,
          trial_ends_at: sub?.trial_ends_at,
          current_period_end: periodEnd,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (activeSub) {
      const priceId = activeSub.items.data[0]?.price?.id;
      const productId = activeSub.items.data[0]?.price?.product as string;
      let periodEnd: string | null = null;
      try {
        const ts = (activeSub as any).current_period_end;
        if (ts) periodEnd = new Date(ts * 1000).toISOString();
      } catch { /* ignore invalid date */ }

      const planId = PRODUCT_MAP[productId] || null;

      // Sync to local DB
      await supabase.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: activeSub.id,
        plan_id: planId,
        status: activeSub.status,
        current_period_end: periodEnd,
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({
        subscribed: true,
        status: activeSub.status,
        plan_id: planId,
        is_comped: false,
        trial_ends_at: sub?.trial_ends_at,
        current_period_end: periodEnd,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No active subscription
    return new Response(JSON.stringify({
      subscribed: false,
      status: "canceled",
      plan_id: null,
      trial_ends_at: sub?.trial_ends_at,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CHECK-SUBSCRIPTION] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCT_MAP: Record<string, string> = {
  "prod_UAlKXnxdRG1Rgt": "basic",
  "prod_UAlMpsN43Fccjn": "professional",
  "prod_UAlQyKMRVwLzDL": "enterprise",
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

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  try {
    // Fetch all non-comped subscriptions from our DB that have a stripe_customer_id
    const { data: localSubs } = await supabase
      .from("subscriptions")
      .select("user_id, stripe_customer_id, stripe_subscription_id, is_comped")
      .eq("is_comped", false)
      .not("stripe_customer_id", "is", null);

    let synced = 0;
    let unchanged = 0;
    const errors: string[] = [];

    // Also pull all users that have a stripe_customer_id via their profile email
    // to catch any that aren't in the local subscriptions table yet
    const customerIds = new Set((localSubs || []).map((s) => s.stripe_customer_id).filter(Boolean));

    // For each known customer, fetch their current subscription status from Stripe
    for (const customerId of customerIds) {
      try {
        const localSub = localSubs!.find((s) => s.stripe_customer_id === customerId);
        if (!localSub) continue;

        // Check all relevant statuses
        let foundSub: Stripe.Subscription | null = null;
        for (const status of ["active", "past_due", "incomplete", "trialing", "canceled", "unpaid"] as const) {
          const results = await stripe.subscriptions.list({
            customer: customerId,
            status,
            limit: 1,
          });
          if (results.data[0]) {
            foundSub = results.data[0];
            // Prefer active/trialing over past_due/canceled
            if (status === "active" || status === "trialing") break;
          }
        }

        if (!foundSub) {
          // No subscription found in Stripe — mark as canceled if not already
          await supabase
            .from("subscriptions")
            .update({ status: "canceled", plan_id: null, current_period_end: null })
            .eq("user_id", localSub.user_id)
            .neq("status", "canceled");
          unchanged++;
          continue;
        }

        const productId = foundSub.items.data[0]?.price?.product as string;
        const planId = PRODUCT_MAP[productId] || null;
        let periodEnd: string | null = null;
        try {
          const ts = (foundSub as any).current_period_end;
          if (ts) periodEnd = new Date(ts * 1000).toISOString();
        } catch { /* ignore */ }

        await supabase
          .from("subscriptions")
          .update({
            stripe_subscription_id: foundSub.id,
            plan_id: planId,
            status: foundSub.status,
            current_period_end: periodEnd,
          })
          .eq("user_id", localSub.user_id);

        console.log(`Synced ${customerId}: ${foundSub.status} / ${planId}`);
        synced++;
      } catch (err) {
        errors.push(`Error syncing customer ${customerId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return new Response(JSON.stringify({ synced, unchanged, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SYNC-STRIPE-SUBSCRIPTIONS] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourcePropertyId, targetPropertyIds } = await req.json();

    if (!sourcePropertyId || !Array.isArray(targetPropertyIds) || targetPropertyIds.length === 0) {
      return new Response(JSON.stringify({ error: "Missing sourcePropertyId or targetPropertyIds" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the source settings
    const { data: source, error: sourceErr } = await supabase
      .from("google_chat_notification_settings")
      .select("webhook_url, notify_on_new_conversation, notify_on_phone_submission, notify_on_insurance_submission")
      .eq("property_id", sourcePropertyId)
      .maybeSingle();

    if (sourceErr || !source?.webhook_url) {
      return new Response(JSON.stringify({ error: "Source property is not connected or webhook URL missing" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Copy to all target properties (skip source)
    const targets = targetPropertyIds.filter((id: string) => id !== sourcePropertyId);
    let successCount = 0;
    let errorCount = 0;

    for (const propertyId of targets) {
      const { error } = await supabase
        .from("google_chat_notification_settings")
        .upsert({
          property_id: propertyId,
          enabled: true,
          webhook_url: source.webhook_url,
          notify_on_new_conversation: source.notify_on_new_conversation,
          notify_on_phone_submission: source.notify_on_phone_submission,
          notify_on_insurance_submission: source.notify_on_insurance_submission,
          updated_at: new Date().toISOString(),
        }, { onConflict: "property_id" });

      if (error) {
        console.error(`[google-chat-bulk-connect] failed for ${propertyId}:`, error);
        errorCount++;
      } else {
        successCount++;
      }
    }

    return new Response(JSON.stringify({ ok: true, successCount, errorCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[google-chat-bulk-connect]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

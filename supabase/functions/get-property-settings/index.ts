import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PropertySettings = {
  ai_response_delay_min_ms: number | null;
  ai_response_delay_max_ms: number | null;
  typing_indicator_min_ms: number | null;
  typing_indicator_max_ms: number | null;
  smart_typing_enabled: boolean | null;
  typing_wpm: number | null;
  max_ai_messages_before_escalation: number | null;
  escalation_keywords: string[] | null;
  auto_escalation_enabled: boolean | null;
  require_email_before_chat: boolean | null;
  require_name_before_chat: boolean | null;
  require_phone_before_chat: boolean | null;
  require_insurance_card_before_chat: boolean | null;
  insurance_collection_prompt: string | null;
  natural_lead_capture_enabled: boolean | null;
  proactive_message_enabled: boolean | null;
  proactive_message: string | null;
  proactive_message_delay_seconds: number | null;
  greeting: string | null;
  ai_base_prompt: string | null;
  widget_icon: string | null;
  human_typos_enabled: boolean | null;
  drop_capitalization_enabled: boolean | null;
  drop_apostrophes_enabled: boolean | null;
  quick_reply_after_first_enabled: boolean | null;
  calendly_url: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_address: string | null;
  business_hours: string | null;
  business_description: string | null;
  name: string | null;
  geo_filter_mode: string | null;
  geo_allowed_states: string[] | null;
  geo_blocked_message: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { propertyId } = await req.json();

    if (!propertyId) {
      return new Response(JSON.stringify({ error: "Property ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase
      .from("properties")
      .select(
        [
          "ai_response_delay_min_ms",
          "ai_response_delay_max_ms",
          "typing_indicator_min_ms",
          "typing_indicator_max_ms",
          "smart_typing_enabled",
          "typing_wpm",
          "max_ai_messages_before_escalation",
          "escalation_keywords",
          "auto_escalation_enabled",
          "require_email_before_chat",
          "require_name_before_chat",
          "require_phone_before_chat",
          "require_insurance_card_before_chat",
          "insurance_collection_prompt",
          "natural_lead_capture_enabled",
          "proactive_message_enabled",
          "proactive_message",
          "proactive_message_delay_seconds",
          "greeting",
          "ai_base_prompt",
          "widget_icon",
          "human_typos_enabled",
          "drop_capitalization_enabled",
          "drop_apostrophes_enabled",
          "quick_reply_after_first_enabled",
          "calendly_url",
          "business_phone",
          "business_email",
          "business_address",
          "business_hours",
          "business_description",
          "name",
          "geo_filter_mode",
          "geo_allowed_states",
          "geo_blocked_message",
        ].join(",")
      )
      .eq("id", propertyId)
      .maybeSingle<PropertySettings>();

    if (error || !data) {
      console.error("get-property-settings: property not found or query error", error);
      return new Response(JSON.stringify({ settings: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ settings: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-property-settings error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

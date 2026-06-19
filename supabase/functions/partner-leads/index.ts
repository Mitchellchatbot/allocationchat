// partner-leads — read-only export of chatbot leads for the Allocation Assist
// dashboard. Returns every visitor the chatbot has pushed to the CRM (Zoho),
// with identity + qualification + the real exported_at timestamp, so the
// dashboard can show recent activity and match conversions.
//
// Auth: shared secret in the `x-partner-key` header (== PARTNER_API_KEY).
// Deployed --no-verify-jwt (called server-to-server by the dashboard's
// chatbot-stats function, not the browser).
import { serve }        from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-partner-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const expected = Deno.env.get("PARTNER_API_KEY") ?? "";
  if (!expected || req.headers.get("x-partner-key") !== expected) {
    return json({ ok: false, reason: "unauthorized" }, 401);
  }

  let body: { from?: string; to?: string } = {};
  try { body = await req.json(); } catch { /* no body is fine */ }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Exported leads = zoho_exports joined to the visitor record. visitor_id is
  // the stable key the dashboard uses to request per-lead detail.
  let q = supabase
    .from("zoho_exports")
    .select("exported_at, zoho_lead_id, visitor_id, visitors!inner(name, email, phone, specialty, qualified, country_of_training, location)")
    .order("exported_at", { ascending: false })
    .limit(5000);
  if (body.from) q = q.gte("exported_at", body.from);
  if (body.to)   q = q.lte("exported_at", body.to);

  const { data, error } = await q;
  if (error) return json({ ok: false, reason: error.message }, 500);

  const leads = (data ?? []).map((r) => {
    const v = (Array.isArray(r.visitors) ? r.visitors[0] : r.visitors) ?? {} as Record<string, unknown>;
    return {
      visitor_id:  (r.visitor_id ?? null) as string | null,
      name:        (v.name ?? null) as string | null,
      email:       (v.email ?? null) as string | null,
      phone:       (v.phone ?? null) as string | null,
      specialty:   (v.specialty ?? null) as string | null,
      country:     (v.country_of_training ?? null) as string | null,
      location:    (v.location ?? null) as string | null,
      qualified:   (v.qualified ?? null) as boolean | null,
      exported_at: r.exported_at as string,
      zoho_lead_id:(r.zoho_lead_id ?? null) as string | null,
    };
  });

  return json({ ok: true, count: leads.length, leads });
});

// partner-lead-detail — per-lead detail for the Allocation Assist dashboard:
// the full visitor record the chatbot captured + the conversation transcript.
//
// Auth: shared secret in the `x-partner-key` header (== PARTNER_API_KEY).
// Deployed --no-verify-jwt (called server-to-server by the dashboard).
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
  if (!expected || req.headers.get("x-partner-key") !== expected) return json({ ok: false, reason: "unauthorized" }, 401);

  let body: { visitor_id?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const visitorId = (body.visitor_id ?? "").trim();
  if (!visitorId) return json({ ok: false, reason: "visitor_id required" }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  // Visitor record (everything the chatbot captured).
  // Only the columns confirmed to exist on the live visitors table (the schema
  // file is aspirational — e.g. occupation/age/gclid aren't present).
  const { data: v, error: vErr } = await supabase
    .from("visitors")
    .select("id, name, email, phone, specialty, country_of_training, qualified, location, created_at")
    .eq("id", visitorId)
    .maybeSingle();
  if (vErr)  return json({ ok: false, reason: vErr.message }, 500);
  if (!v)    return json({ ok: false, reason: "visitor not found" }, 404);

  // Their conversation(s) + the transcript.
  const { data: convs } = await supabase
    .from("conversations")
    .select("id, status, created_at")
    .eq("visitor_id", visitorId)
    .order("created_at", { ascending: true });
  const convIds = (convs ?? []).map(c => c.id);

  let messages: Array<{ sender_type: string; content: string; created_at: string }> = [];
  if (convIds.length) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("sender_type, content, created_at, sequence_number")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: true })
      .order("sequence_number", { ascending: true })
      .limit(500);
    messages = (msgs ?? []).map(m => ({
      sender_type: String(m.sender_type ?? ""),
      content:     String(m.content ?? ""),
      created_at:  String(m.created_at ?? ""),
    }));
  }

  return json({
    ok: true,
    visitor: {
      name:        v.name ?? null,
      email:       v.email ?? null,
      phone:       v.phone ?? null,
      specialty:   v.specialty ?? null,
      country:     v.country_of_training ?? null,
      qualified:   v.qualified ?? null,
      location:    v.location ?? null,
      firstSeen:   v.created_at ?? null,
    },
    conversationStatus: convs?.[convs.length - 1]?.status ?? null,
    messages,
  });
});

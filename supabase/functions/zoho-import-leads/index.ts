// One-off bulk importer for leads collected outside the chatbot (spreadsheet
// backfills, ad-campaign exports). Deliberately separate from zoho-export-leads:
// that function reads the `visitors` table and SKIPS anything isQualified()
// rejects, so it can never file a rejected lead under "Unqualified Leads". This
// one takes fully-formed rows and an explicit Lead_Status per row.
//
// Two traps this function guards against, both learned the hard way:
//   1. Zoho freezes a picklist's actual_value when the option is renamed in the
//      UI. On this org, Lead_Status display "Not Contacted" has actual_value
//      "Not Qualified". Writing the display string is silently wrong, so every
//      picklist value is validated against the live field metadata before any
//      record is sent.
//   2. Bulk inserts fire workflow rules by default. This org has a rule on
//      unqualified leads, and a backfill of real doctors would mass-send
//      whatever that rule does. `trigger: []` suppresses workflows, approvals
//      and blueprints unless the caller explicitly opts in.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function deriveKey(usage: "encrypt" | "decrypt"): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("zoho-token-encryption-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

async function decryptToken(encrypted: string): Promise<string> {
  if (!encrypted.startsWith("enc:")) return encrypted;
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const iv = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
  const key = await deriveKey("decrypt");
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuffer);
}

async function encryptToken(plaintext: string): Promise<string> {
  const key = await deriveKey("encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return `enc:${btoa(String.fromCharCode(...iv))}:${btoa(String.fromCharCode(...new Uint8Array(ciphertext)))}`;
}

async function refreshAccessToken(
  supabase: ReturnType<typeof createClient>,
  connection: Record<string, string>,
): Promise<string | null> {
  if (!connection.refresh_token_enc) return null;
  let refreshToken: string;
  try {
    refreshToken = await decryptToken(connection.refresh_token_enc);
  } catch {
    return null;
  }
  const accountsDomain = connection.data_center === "com"
    ? "accounts.zoho.com"
    : `accounts.zoho.${connection.data_center}`;
  const res = await fetch(`https://${accountsDomain}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get("ZOHO_CLIENT_ID")!,
      client_secret: Deno.env.get("ZOHO_CLIENT_SECRET")!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) return null;
  await supabase.from("zoho_connections").update({
    access_token_enc: await encryptToken(data.access_token),
    access_token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
  }).eq("property_id", connection.property_id);
  return data.access_token;
}

// Pull live picklist metadata so we validate against what Zoho actually accepts
// (actual_value), not what the UI displays.
async function fetchPicklists(
  apiDomain: string,
  accessToken: string,
): Promise<{ status: number; picklists?: Record<string, Set<string>> }> {
  const res = await fetch(`${apiDomain}/crm/v2/settings/fields?module=Leads`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  if (res.status === 401) return { status: 401 };
  const data = await res.json();
  if (!res.ok || !data.fields) return { status: res.status };
  // Accept EITHER display_value or actual_value. When a picklist option is
  // renamed, Zoho keeps the old string as actual_value but matches writes
  // against the current display_value — writing the actual_value of a renamed
  // option stores that literal string instead of selecting the option. So
  // validating against actual_value alone rejects the string that actually
  // works. Callers should send the display value.
  const picklists: Record<string, Set<string>> = {};
  for (const f of data.fields) {
    if (f.data_type === "picklist" && Array.isArray(f.pick_list_values)) {
      const values = new Set<string>();
      for (const v of f.pick_list_values as Array<{ display_value: string; actual_value: string }>) {
        if (v.display_value) values.add(v.display_value);
        if (v.actual_value) values.add(v.actual_value);
      }
      picklists[f.api_name] = values;
    }
  }
  return { status: res.status, picklists };
}

const PICKLIST_FIELDS = ["Lead_Status", "Lead_Source", "Specialty_New"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const {
      propertyId = "bfb299de-1589-4e71-a2a7-e1504e0d785a",
      leads = [],
      dryRun = true,
      fireWorkflows = false,
      // "create" inserts new records. "read" fetches existing ones by id so a
      // write can be confirmed against what Zoho actually stored, rather than
      // trusting the field metadata. "update" PUTs changes to existing ids.
      mode = "create",
      ids = [],
    } = body;

    if (mode === "create" && (!Array.isArray(leads) || leads.length === 0)) {
      return new Response(JSON.stringify({ error: "No leads supplied" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: connection } = await supabase
      .from("zoho_connections")
      .select("*")
      .eq("property_id", propertyId)
      .single();

    if (!connection) {
      return new Response(JSON.stringify({ error: "No Zoho connection for property" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = await decryptToken(connection.access_token_enc);

    let meta = await fetchPicklists(connection.api_domain, accessToken);
    if (meta.status === 401) {
      const fresh = await refreshAccessToken(supabase, connection as Record<string, string>);
      if (!fresh) {
        return new Response(JSON.stringify({ error: "Zoho token refresh failed" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = fresh;
      meta = await fetchPicklists(connection.api_domain, accessToken);
    }
    if (!meta.picklists) {
      return new Response(JSON.stringify({ error: `Could not read Zoho field metadata (HTTP ${meta.status})` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read-back mode: fetch records by id so a write can be verified against
    // what Zoho actually stored.
    if (mode === "read") {
      const rows: Array<Record<string, unknown>> = [];
      for (const id of ids) {
        const r = await fetch(
          `${connection.api_domain}/crm/v2/Leads/${id}?fields=Last_Name,First_Name,Email,Lead_Status,Lead_Source,Specialty_New,Description,Created_Time,Phone`,
          { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } },
        );
        const d = await r.json();
        const rec = d?.data?.[0];
        rows.push(rec
          ? {
            id,
            name: [rec.First_Name, rec.Last_Name].filter(Boolean).join(" "),
            email: rec.Email,
            phone: rec.Phone,
            Lead_Status: rec.Lead_Status,
            Lead_Source: rec.Lead_Source,
            Specialty_New: rec.Specialty_New,
            Created_Time: rec.Created_Time,
            Description: rec.Description,
          }
          : { id, error: `HTTP ${r.status}`, raw: d });
      }
      return new Response(JSON.stringify({ mode: "read", rows }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update mode: `leads` carries an `id` per row plus the fields to change.
    if (mode === "update") {
      const badStatus = leads.filter((l: Record<string, unknown>) =>
        l.Lead_Status && !meta.picklists!.Lead_Status?.has(String(l.Lead_Status)));
      if (badStatus.length) {
        return new Response(JSON.stringify({
          error: "Invalid Lead_Status — nothing was sent",
          values: [...new Set(badStatus.map((l: Record<string, unknown>) => l.Lead_Status))],
        }, null, 2), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (dryRun) {
        return new Response(JSON.stringify({ mode: "update", dryRun: true, count: leads.length, sample: leads.slice(0, 3) }, null, 2), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const payload: Record<string, unknown> = { data: leads };
      if (!fireWorkflows) payload.trigger = [];
      const r = await fetch(`${connection.api_domain}/crm/v2/Leads`, {
        method: "PUT",
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      const rows = (d?.data || []).map((row: Record<string, unknown>, i: number) => ({
        id: (leads[i] as Record<string, unknown>).id,
        code: row.code,
        message: row.message,
      }));
      return new Response(JSON.stringify({
        mode: "update",
        httpStatus: r.status,
        updated: rows.filter((x: Record<string, unknown>) => x.code === "SUCCESS").length,
        failed: rows.filter((x: Record<string, unknown>) => x.code !== "SUCCESS").length,
        rows,
        // Zoho signals some failures at the top level rather than per-record,
        // so never discard the raw body — an empty `rows` with no error is
        // indistinguishable from success otherwise.
        raw: rows.length === 0 ? d : undefined,
      }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate every picklist value up front and refuse the whole batch if any
    // is wrong. A bad value is accepted-then-dropped by Zoho, which would leave
    // a half-correct import that is tedious to unpick by hand.
    const invalid: Array<{ index: number; field: string; value: string }> = [];
    leads.forEach((lead: Record<string, unknown>, i: number) => {
      for (const field of PICKLIST_FIELDS) {
        const value = lead[field];
        if (value === undefined || value === null || value === "") continue;
        if (!meta.picklists![field]?.has(String(value))) {
          invalid.push({ index: i, field, value: String(value) });
        }
      }
    });

    if (invalid.length > 0) {
      return new Response(JSON.stringify({
        error: "Invalid picklist values — nothing was sent to Zoho",
        invalid,
        hint: "Use the picklist actual_value, not the label shown in the Zoho UI.",
      }, null, 2), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        dryRun: true,
        validated: leads.length,
        wouldSuppressWorkflows: !fireWorkflows,
        statusBreakdown: leads.reduce((acc: Record<string, number>, l: Record<string, unknown>) => {
          const k = String(l.Lead_Status ?? "(none)");
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {}),
        sample: leads.slice(0, 3),
      }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Zoho caps inserts at 100 records per call.
    const results: Array<Record<string, unknown>> = [];
    for (let i = 0; i < leads.length; i += 100) {
      const chunk = leads.slice(i, i + 100).map((l: Record<string, unknown>) => ({
        ...l,
        Owner: connection.default_owner_id ? { id: connection.default_owner_id } : undefined,
      }));

      const payload: Record<string, unknown> = { data: chunk };
      if (!fireWorkflows) payload.trigger = [];

      const doPost = () => fetch(`${connection.api_domain}/crm/v2/Leads`, {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let res = await doPost();
      if (res.status === 401) {
        const fresh = await refreshAccessToken(supabase, connection as Record<string, string>);
        if (fresh) {
          accessToken = fresh;
          res = await doPost();
        }
      }

      const data = await res.json();
      (data?.data || []).forEach((row: Record<string, unknown>, j: number) => {
        const lead = chunk[j] as Record<string, unknown>;
        results.push({
          name: [lead.First_Name, lead.Last_Name].filter(Boolean).join(" "),
          email: lead.Email ?? null,
          leadStatus: lead.Lead_Status ?? null,
          code: row.code,
          zohoId: (row.details as Record<string, unknown>)?.id ?? null,
          message: row.message,
        });
      });
    }

    const created = results.filter(r => r.code === "SUCCESS").length;
    const duplicates = results.filter(r => r.code === "DUPLICATE_DATA").length;
    const failed = results.filter(r => r.code !== "SUCCESS" && r.code !== "DUPLICATE_DATA");

    return new Response(JSON.stringify({
      dryRun: false,
      total: leads.length,
      created,
      duplicates,
      failed: failed.length,
      workflowsSuppressed: !fireWorkflows,
      results,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

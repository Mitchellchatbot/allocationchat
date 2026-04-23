import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUALIFIED_COUNTRIES = [
  'europe', 'united kingdom', 'uk', 'united states', 'usa', 'us', 'america',
  'canada', 'south africa', 'australia', 'new zealand', 'south america',
];

// Retry backoff delays in minutes: attempt 1→5m, 2→30m, 3→2h, 4→8h, 5→give up
const RETRY_DELAYS_MINUTES = [5, 30, 120, 480];
const MAX_RETRIES = RETRY_DELAYS_MINUTES.length;

function isQualified(visitor: Record<string, string | null>): boolean {
  const country = (visitor.country_of_training || '').toLowerCase();
  if (!QUALIFIED_COUNTRIES.some(c => country.includes(c))) return false;
  const age = parseInt(visitor.age || '');
  if (isNaN(age) || age < 30 || age > 60) return false;
  return true;
}

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

// Returns a fresh access token and saves it. Returns null if refresh fails.
async function refreshAccessToken(
  supabase: ReturnType<typeof createClient>,
  connection: Record<string, string>,
): Promise<string | null> {
  if (!connection.refresh_token_enc) {
    console.error("No refresh token available for property:", connection.property_id);
    return null;
  }

  let refreshToken: string;
  try {
    refreshToken = await decryptToken(connection.refresh_token_enc);
  } catch (e) {
    console.error("Failed to decrypt refresh token:", e);
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
  if (!data.access_token) {
    console.error("Zoho token refresh failed:", JSON.stringify(data));
    return null;
  }

  const encNew = await encryptToken(data.access_token);
  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

  const { error } = await supabase
    .from("zoho_connections")
    .update({ access_token_enc: encNew, access_token_expires_at: expiresAt })
    .eq("property_id", connection.property_id);

  if (error) console.error("Failed to save refreshed token:", error);
  else console.log("Token refreshed and saved for property:", connection.property_id);

  return data.access_token;
}

// Returns the HTTP status code alongside the lead id so callers can react to 401 specifically.
async function createZohoLead(
  apiDomain: string,
  accessToken: string,
  visitor: Record<string, string | null>,
): Promise<{ id: string; status: number } | { id: null; status: number }> {
  const nameParts = (visitor.name || "").trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : nameParts[0] || "Unknown";
  const firstName = nameParts.length > 1 ? nameParts[0] : "";

  const description = [
    visitor.specialty ? `Specialty: ${visitor.specialty}` : null,
    visitor.country_of_training ? `Country of Training: ${visitor.country_of_training}` : null,
    visitor.age ? `Age: ${visitor.age}` : null,
  ].filter(Boolean).join(" | ");

  const leadPayload = {
    data: [{
      Last_Name: lastName,
      First_Name: firstName || undefined,
      Email: visitor.email || undefined,
      Phone: visitor.phone || undefined,
      Designation: visitor.specialty || undefined,
      Description: description || undefined,
      Lead_Source: "Chatbot",
      Lead_Status: "New",
    }],
  };

  let res: Response;
  try {
    res = await fetch(`${apiDomain}/crm/v2/Leads`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(leadPayload),
    });
  } catch (e) {
    console.error("Network error calling Zoho API:", e);
    return { id: null, status: 0 };
  }

  if (res.status === 401) {
    console.warn("Zoho API returned 401 — token expired or invalid");
    return { id: null, status: 401 };
  }

  const data = await res.json();
  if (!res.ok || data.data?.[0]?.status === "error") {
    console.error("Zoho create lead error:", JSON.stringify(data));
    return { id: null, status: res.status };
  }

  return { id: data.data?.[0]?.details?.id, status: res.status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { propertyId, visitorIds } = body;

    let targetVisitorIds: string[] = [];
    let targetPropertyId: string = propertyId;

    if (visitorIds?.length) {
      // Manual export from UI
      targetVisitorIds = visitorIds;
    } else {
      // Queue-based: fetch pending exports due for processing
      const { data: queue } = await supabase
        .from("zoho_export_queue")
        .select("visitor_id, property_id, id")
        .eq("status", "pending")
        .lte("next_attempt_at", new Date().toISOString())
        .limit(20);

      if (!queue?.length) {
        return new Response(JSON.stringify({ exported: 0, message: "No pending exports" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      targetVisitorIds = [...new Set(queue.map((q: any) => q.visitor_id))];
      targetPropertyId = queue[0].property_id;
    }

    // Load Zoho connection for this property
    const { data: connection } = await supabase
      .from("zoho_connections")
      .select("*")
      .eq("property_id", targetPropertyId)
      .single();

    if (!connection) {
      return new Response(JSON.stringify({ error: "Zoho not connected for this property" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Proactively refresh token if it expires within the next 5 minutes
    let accessToken: string;
    const expiresAt = connection.access_token_expires_at
      ? new Date(connection.access_token_expires_at).getTime()
      : null;
    const fiveMinutes = 5 * 60 * 1000;

    if (!expiresAt || expiresAt - Date.now() < fiveMinutes) {
      console.log("Token near expiry or unknown — refreshing proactively");
      const refreshed = await refreshAccessToken(supabase, connection as Record<string, string>);
      if (refreshed) {
        accessToken = refreshed;
      } else {
        // Refresh failed — still try with existing token (might still work if expiry unknown)
        console.warn("Proactive refresh failed, proceeding with existing token");
        accessToken = await decryptToken(connection.access_token_enc);
      }
    } else {
      accessToken = await decryptToken(connection.access_token_enc);
    }

    const results = { exported: 0, skipped: 0, errors: [] as string[] };

    for (const visitorId of targetVisitorIds) {
      // Skip if already successfully exported
      const { data: existing } = await supabase
        .from("zoho_exports")
        .select("id")
        .eq("visitor_id", visitorId)
        .maybeSingle();

      if (existing) {
        results.skipped++;
        continue;
      }

      const { data: visitor } = await supabase
        .from("visitors")
        .select("name, email, phone, age, specialty, country_of_training, qualified")
        .eq("id", visitorId)
        .single();

      if (!visitor) {
        results.errors.push(`Visitor ${visitorId} not found`);
        continue;
      }

      // Skip unqualified leads
      if (visitor.qualified === false || !isQualified(visitor as Record<string, string | null>)) {
        console.log(`Skipping unqualified visitor ${visitorId}`);
        results.skipped++;
        await supabase
          .from("zoho_export_queue")
          .update({ status: "skipped", updated_at: new Date().toISOString() })
          .eq("visitor_id", visitorId)
          .eq("status", "pending");
        continue;
      }

      let result = await createZohoLead(connection.api_domain, accessToken, visitor as Record<string, string | null>);

      // On 401 specifically: refresh token and retry once
      if (result.status === 401) {
        console.log("Got 401 — refreshing token and retrying");
        const newToken = await refreshAccessToken(supabase, connection as Record<string, string>);
        if (newToken) {
          accessToken = newToken;
          result = await createZohoLead(connection.api_domain, accessToken, visitor as Record<string, string | null>);
        }
      }

      if (!result.id) {
        // Get current retry count
        const { data: queueItem } = await supabase
          .from("zoho_export_queue")
          .select("retry_count")
          .eq("visitor_id", visitorId)
          .eq("status", "pending")
          .maybeSingle();

        const retryCount = (queueItem?.retry_count ?? 0) + 1;
        const errorMsg = `HTTP ${result.status} on attempt ${retryCount}`;

        if (retryCount > MAX_RETRIES) {
          // Permanently failed after max retries
          console.error(`Visitor ${visitorId} permanently failed after ${MAX_RETRIES} retries`);
          await supabase
            .from("zoho_export_queue")
            .update({
              status: "failed",
              error_message: `Permanently failed after ${MAX_RETRIES} retries. Last error: ${errorMsg}`,
              updated_at: new Date().toISOString(),
            })
            .eq("visitor_id", visitorId)
            .eq("status", "pending");
        } else {
          const delayMinutes = RETRY_DELAYS_MINUTES[retryCount - 1];
          const nextAttempt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
          console.warn(`Visitor ${visitorId} failed (attempt ${retryCount}), retrying in ${delayMinutes}m`);
          await supabase
            .from("zoho_export_queue")
            .update({
              status: "pending",
              retry_count: retryCount,
              next_attempt_at: nextAttempt,
              error_message: errorMsg,
              updated_at: new Date().toISOString(),
            })
            .eq("visitor_id", visitorId)
            .eq("status", "pending");
        }

        results.errors.push(`Visitor ${visitorId}: ${errorMsg}`);
        continue;
      }

      // Record successful export
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("visitor_id", visitorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      await supabase.from("zoho_exports").insert({
        visitor_id: visitorId,
        conversation_id: conv?.id || null,
        zoho_lead_id: result.id,
      });

      await supabase
        .from("zoho_export_queue")
        .update({ status: "success", exported_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("visitor_id", visitorId)
        .eq("status", "pending");

      results.exported++;
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("zoho-export-leads error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Proactively refreshes all Salesforce access tokens that are within 90 minutes
// of expiry. Runs every 30 minutes via cron so tokens never expire in practice.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Encryption helpers (same key derivation as salesforce-export-leads) ──────

async function deriveKey(usage: "encrypt" | "decrypt"): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("salesforce-token-encryption-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    [usage]
  );
}

async function decryptToken(encrypted: string): Promise<string> {
  if (!encrypted.startsWith("enc:")) return encrypted;
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const iv = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
  const key = await deriveKey("decrypt");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plain);
}

async function encryptToken(plaintext: string): Promise<string> {
  const key = await deriveKey("encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return `enc:${btoa(String.fromCharCode(...iv))}:${btoa(String.fromCharCode(...new Uint8Array(ciphertext)))}`;
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function refreshOrg(supabase: ReturnType<typeof createClient>, org: {
  id: string;
  instance_url: string;
  refresh_token: string;
  client_id?: string;
  client_secret?: string;
  login_url?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    let refreshToken: string;
    try {
      refreshToken = await decryptToken(org.refresh_token);
    } catch (decryptErr) {
      return { success: false, error: `Decryption failed: ${String(decryptErr)}` };
    }

    const clientId = org.client_id || Deno.env.get("SALESFORCE_CLIENT_ID");
    const clientSecret = org.client_secret || Deno.env.get("SALESFORCE_CLIENT_SECRET");
    const loginUrl = org.login_url || "https://login.salesforce.com";

    console.log(`[refresh] org=${org.instance_url} client_id_source=${org.client_id ? 'db' : 'env'} client_id_prefix=${clientId?.slice(0, 10)} secret_present=${!!clientSecret} refresh_token_length=${refreshToken.length} refresh_token_prefix=${refreshToken.slice(0, 8)}`);

    if (!clientId || !clientSecret) {
      return { success: false, error: "No client credentials configured" };
    }

    const res = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    const responseBody = await res.text();
    console.log(`[refresh] org=${org.instance_url} status=${res.status} body=${responseBody.slice(0, 300)}`);

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}: ${responseBody.slice(0, 200)}` };
    }

    let tokenData: any;
    try {
      tokenData = JSON.parse(responseBody);
    } catch {
      return { success: false, error: `Failed to parse token response: ${responseBody.slice(0, 200)}` };
    }

    if (!tokenData.access_token) {
      return { success: false, error: `No access_token in response: ${JSON.stringify(tokenData).slice(0, 200)}` };
    }

    const encryptedToken = await encryptToken(tokenData.access_token);
    // Salesforce doesn't return expires_in — use 2h as conservative estimate.
    // We refresh at 90-min mark so this guarantees tokens never actually expire.
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Salesforce can rotate the refresh token — store the new one if returned.
    const orgUpdatePayload: Record<string, unknown> = {
      access_token: encryptedToken,
      token_expires_at: expiresAt,
      updated_at: now,
    };
    if (tokenData.refresh_token) {
      orgUpdatePayload.refresh_token = await encryptToken(tokenData.refresh_token);
    }

    await supabase
      .from("salesforce_orgs")
      .update(orgUpdatePayload)
      .eq("id", org.id);

    // Keep salesforce_settings in sync for any properties using this org.
    // Propagate a rotated refresh token as well so the legacy fallback path
    // (export-leads reading directly from salesforce_settings) stays current.
    const settingsUpdatePayload: Record<string, unknown> = {
      access_token: encryptedToken,
      token_expires_at: expiresAt,
      updated_at: now,
    };
    if (tokenData.refresh_token) {
      settingsUpdatePayload.refresh_token = orgUpdatePayload.refresh_token;
    }
    await supabase
      .from("salesforce_settings")
      .update(settingsUpdatePayload)
      .eq("salesforce_org_id", org.id);

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Refresh anything expiring within 90 minutes (cron runs every 30 min)
  const refreshBefore = new Date(Date.now() + 90 * 60 * 1000).toISOString();

  const { data: orgs, error } = await supabase
    .from("salesforce_orgs")
    .select("id, user_id, instance_url, refresh_token, client_id, client_secret, login_url, token_expires_at")
    .not("refresh_token", "is", null)
    .or(`token_expires_at.is.null,token_expires_at.lt.${refreshBefore}`);

  if (error) {
    console.error("[refresh-salesforce-tokens] query error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!orgs || orgs.length === 0) {
    return new Response(JSON.stringify({ refreshed: 0, failed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[refresh-salesforce-tokens] refreshing ${orgs.length} org(s)`);

  const adminWebhook = Deno.env.get("ADMIN_SLACK_WEBHOOK_URL");
  let refreshed = 0;
  let failed = 0;
  const refreshedLines: string[] = [];

  for (const org of orgs) {
    const result = await refreshOrg(supabase, org as any);
    if (result.success) {
      refreshed++;
      console.log(`[refresh-salesforce-tokens] ✓ refreshed ${org.instance_url}`);

      // Collect property names for the summary message
      const { data: successProps } = await supabase
        .from("salesforce_settings")
        .select("property_id, properties(name, domain)")
        .eq("salesforce_org_id", org.id);
      const propNames = (successProps ?? [])
        .map((s: any) => s.properties?.name || s.properties?.domain || s.property_id)
        .join(", ") || org.instance_url;
      refreshedLines.push(`✅ ${propNames}`);
    } else {
      failed++;
      console.error(`[refresh-salesforce-tokens] ✗ failed ${org.instance_url}: ${result.error}`);

      // Alert to admin Slack — token refresh failure means leads will break imminently
      if (adminWebhook) {
        const expiredAt = org.token_expires_at
          ? new Date(org.token_expires_at).toLocaleString("en-US", { timeZone: "America/New_York" })
          : "unknown";

        // Look up which properties use this org
        const { data: affectedProps } = await supabase
          .from("salesforce_settings")
          .select("property_id, properties(name, domain)")
          .eq("salesforce_org_id", org.id);

        const propertyLines = (affectedProps ?? [])
          .map((s: any) => `${s.properties?.name || s.properties?.domain || "Unknown"} (\`${s.property_id}\`)`)
          .join("\n") || "Unknown";

        await fetch(adminWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: [
              {
                type: "header",
                text: { type: "plain_text", text: "🔴 Salesforce Token Refresh Failed", emoji: true },
              },
              {
                type: "section",
                fields: [
                  { type: "mrkdwn", text: `*Properties:*\n${propertyLines}` },
                  { type: "mrkdwn", text: `*Org:*\n${org.instance_url}` },
                  { type: "mrkdwn", text: `*Token expires:*\n${expiredAt} ET` },
                  { type: "mrkdwn", text: `*Error:*\n${(result.error || "Unknown").slice(0, 300)}` },
                ],
              },
              {
                type: "section",
                text: { type: "mrkdwn", text: "⚠️ *Lead exports for this client will start failing unless they reconnect Salesforce.* Ask them to re-authenticate at Notifications → Salesforce." },
              },
            ],
          }),
        }).catch(e => console.error("[refresh-salesforce-tokens] slack alert failed:", e));
      }
    }
  }

  console.log(`[refresh-salesforce-tokens] done: ${refreshed} refreshed, ${failed} failed`);

  // Reconciliation pass — any salesforce_settings row that shares an instance_url
  // with an org but has a different (or missing) salesforce_org_id gets corrected.
  // This self-heals properties that were bulk-connected without the salesforce_org_id being set.
  for (const org of orgs) {
    if (!org.user_id) continue;
    const { data: propRows } = await supabase
      .from("properties")
      .select("id")
      .eq("user_id", org.user_id);
    const propIds = (propRows || []).map((p: any) => p.id);
    if (propIds.length === 0) continue;
    await supabase
      .from("salesforce_settings")
      .update({ salesforce_org_id: org.id, updated_at: new Date().toISOString() })
      .in("property_id", propIds)
      .ilike("instance_url", org.instance_url)
      .neq("salesforce_org_id", org.id);
  }

  // Send a summary Slack message if anything was refreshed
  if (adminWebhook && refreshed > 0) {
    await fetch(adminWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "🔄 Salesforce Token Refresh Summary", emoji: true },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: refreshedLines.join("\n"),
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `${refreshed} refreshed · ${failed} failed · ${orgs.length} total`,
              },
            ],
          },
        ],
      }),
    }).catch(e => console.error("[refresh-salesforce-tokens] summary slack failed:", e));
  }

  return new Response(JSON.stringify({ refreshed, failed, total: orgs.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

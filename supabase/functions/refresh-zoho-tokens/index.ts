import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch connections that either have no expiry recorded, or expire within the next 35 minutes.
  // Running on a 30-min cron with a 35-min lookahead means every token is refreshed
  // at least 5 minutes before it could expire, with one full cron cycle of headroom.
  const threshold = new Date(Date.now() + 35 * 60 * 1000).toISOString();

  const { data: connections, error } = await supabase
    .from("zoho_connections")
    .select("property_id, refresh_token_enc, data_center, access_token_expires_at")
    .or(`access_token_expires_at.is.null,access_token_expires_at.lte.${threshold}`);

  if (error) {
    console.error("Failed to fetch Zoho connections:", error);
    return new Response(JSON.stringify({ error: "DB error" }), { status: 500 });
  }

  if (!connections?.length) {
    console.log("No Zoho tokens need refreshing");
    return new Response(JSON.stringify({ refreshed: 0 }));
  }

  const results = { refreshed: 0, failed: 0, skipped: 0 };

  for (const conn of connections) {
    if (!conn.refresh_token_enc) {
      console.warn(`No refresh token for property ${conn.property_id} — skipping`);
      results.skipped++;
      continue;
    }

    let refreshToken: string;
    try {
      refreshToken = await decryptToken(conn.refresh_token_enc);
    } catch (e) {
      console.error(`Failed to decrypt refresh token for property ${conn.property_id}:`, e);
      results.failed++;
      continue;
    }

    const accountsDomain = conn.data_center === "com"
      ? "accounts.zoho.com"
      : `accounts.zoho.${conn.data_center}`;

    try {
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
        console.error(`Token refresh failed for property ${conn.property_id}:`, JSON.stringify(data));
        results.failed++;
        continue;
      }

      const encNew = await encryptToken(data.access_token);
      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

      const { error: updateError } = await supabase
        .from("zoho_connections")
        .update({ access_token_enc: encNew, access_token_expires_at: expiresAt })
        .eq("property_id", conn.property_id);

      if (updateError) {
        console.error(`Failed to save refreshed token for property ${conn.property_id}:`, updateError);
        results.failed++;
      } else {
        console.log(`Refreshed token for property ${conn.property_id}, expires at ${expiresAt}`);
        results.refreshed++;
      }
    } catch (e) {
      console.error(`Network error refreshing token for property ${conn.property_id}:`, e);
      results.failed++;
    }
  }

  console.log("Zoho token refresh complete:", results);
  return new Response(JSON.stringify(results));
});

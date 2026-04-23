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

async function encryptToken(plaintext: string): Promise<string> {
  const key = await deriveKey("encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `enc:${ivB64}:${ctB64}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const closeWithMessage = (type: string, payload: Record<string, string> = {}) => {
    const script = `
      <script>
        window.opener && window.opener.postMessage(${JSON.stringify({ type, ...payload })}, '*');
        window.close();
      </script>`;
    return new Response(script, { headers: { "Content-Type": "text/html" } });
  };

  if (errorParam) {
    return closeWithMessage("zoho-oauth-error", { error: errorParam });
  }

  if (!code || !stateRaw) {
    return closeWithMessage("zoho-oauth-error", { error: "Missing code or state" });
  }

  let stateData: { propertyId: string; userId: string; dataCenter: string };
  try {
    stateData = JSON.parse(atob(stateRaw));
  } catch {
    return closeWithMessage("zoho-oauth-error", { error: "Invalid state" });
  }

  const { propertyId, userId, dataCenter = "com" } = stateData;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("ZOHO_CLIENT_ID")!;
    const clientSecret = Deno.env.get("ZOHO_CLIENT_SECRET")!;

    const redirectUri = `${supabaseUrl}/functions/v1/zoho-oauth-callback`;
    const accountsDomain = dataCenter === "com" ? "accounts.zoho.com" : `accounts.zoho.${dataCenter}`;

    const tokenRes = await fetch(`https://${accountsDomain}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      console.error("Zoho token exchange error:", tokenData);
      return closeWithMessage("zoho-oauth-error", { error: tokenData.error || "Token exchange failed" });
    }

    const { access_token, refresh_token, api_domain, expires_in } = tokenData;

    // Infer actual API domain from Zoho response (handles all data centers)
    const apiDomain = api_domain || `https://www.zohoapis.${dataCenter === "com" ? "com" : dataCenter}`;

    const encAccessToken = await encryptToken(access_token);
    const encRefreshToken = refresh_token ? await encryptToken(refresh_token) : null;
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await supabase
      .from("zoho_connections")
      .upsert({
        property_id: propertyId,
        user_id: userId,
        access_token_enc: encAccessToken,
        refresh_token_enc: encRefreshToken,
        api_domain: apiDomain,
        data_center: dataCenter,
        connected_at: new Date().toISOString(),
        access_token_expires_at: expiresAt,
      }, { onConflict: "property_id" });

    if (upsertError) {
      console.error("Error saving Zoho connection:", upsertError);
      return closeWithMessage("zoho-oauth-error", { error: "Failed to save connection" });
    }

    return closeWithMessage("zoho-oauth-success");
  } catch (error) {
    console.error("zoho-oauth-callback error:", error);
    return closeWithMessage("zoho-oauth-error", { error: "Internal server error" });
  }
});

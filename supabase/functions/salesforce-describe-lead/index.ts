import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Decryption helpers (AES-256-GCM, key derived from service role key) ---

async function deriveKey(usage: "encrypt" | "decrypt"): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("salesforce-token-encryption-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    [usage]
  );
}

async function decryptToken(encrypted: string): Promise<string> {
  // If not encrypted (legacy plaintext), return as-is
  if (!encrypted.startsWith("enc:")) {
    return encrypted;
  }
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");

  const ivB64 = parts[1];
  const ctB64 = parts[2];
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));

  const key = await deriveKey("decrypt");
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plainBuffer);
}

async function encryptToken(plaintext: string): Promise<string> {
  const key = await deriveKey("encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `enc:${ivB64}:${ctB64}`;
}

function decodeJwtPayload(jwt: string): { sub?: string; exp?: number } | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { propertyId } = await req.json();

    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: "Property ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Authorization: Verify property exists ---
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("user_id")
      .eq("id", propertyId)
      .single();

    if (propError || !property) {
      console.error("Property not found", propertyId);
      return new Response(
        JSON.stringify({ error: "Forbidden: you do not own this property" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Salesforce settings for this property
    const { data: settings, error: settingsError } = await supabase
      .from("salesforce_settings")
      .select("*")
      .eq("property_id", propertyId)
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: "Salesforce settings not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch linked org if available
    let org: any = null;
    if ((settings as any).salesforce_org_id) {
      const { data: orgData } = await supabase
        .from("salesforce_orgs")
        .select("id, instance_url, access_token, refresh_token, token_expires_at, client_id, client_secret, login_url")
        .eq("id", (settings as any).salesforce_org_id)
        .single();
      org = orgData;
    }

    // Use org-level token if available, fall back to per-property token (legacy)
    const effectiveInstanceUrl = org?.instance_url || settings.instance_url;
    const effectiveAccessToken = org?.access_token || settings.access_token;

    if (!effectiveInstanceUrl || !effectiveAccessToken) {
      return new Response(
        JSON.stringify({ error: "Salesforce not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt the access token
    const accessToken = await decryptToken(effectiveAccessToken);

    // Call Salesforce Lead describe API
    const describeUrl = `${effectiveInstanceUrl}/services/data/v59.0/sobjects/Lead/describe`;

    const sfResponse = await fetch(describeUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!sfResponse.ok) {
      // Token might be expired, try to refresh
      const effectiveRefreshToken = org?.refresh_token || settings.refresh_token;
      if (sfResponse.status === 401 && effectiveRefreshToken) {
        const refreshed = await refreshAccessToken(supabase, settings, org);
        if (refreshed) {
          // Retry with new token
          const retryResponse = await fetch(describeUrl, {
            headers: {
              "Authorization": `Bearer ${refreshed}`,
              "Content-Type": "application/json",
            },
          });

          if (retryResponse.ok) {
            const data = await retryResponse.json();
            return new Response(
              JSON.stringify({ fields: extractLeadFields(data), statusValues: extractPicklistValues(data, 'Status') }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      const errorText = await sfResponse.text();
      console.error("Salesforce API error:", errorText);
      // Detect session expiry and return a specific error
      const isSessionExpired = errorText.includes("INVALID_SESSION_ID") || errorText.includes("Session expired");
      return new Response(
        JSON.stringify({ error: isSessionExpired ? "Session expired or invalid. Please reconnect your Salesforce account." : "Failed to fetch Lead fields from Salesforce" }),
        { status: isSessionExpired ? 401 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await sfResponse.json();
    const fields = extractLeadFields(data);
    const statusValues = extractPicklistValues(data, 'Status');

    return new Response(
      JSON.stringify({ fields, statusValues }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractLeadFields(describeData: any) {
  return describeData.fields
    .filter((field: any) => field.createable && !field.deprecatedAndHidden)
    .map((field: any) => ({
      name: field.name,
      label: field.label,
      type: field.type,
      required: !field.nillable && !field.defaultedOnCreate,
    }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label));
}

function extractPicklistValues(describeData: any, fieldName: string): { value: string; label: string; isDefault: boolean }[] {
  const field = describeData.fields?.find((f: any) => f.name === fieldName);
  if (!field?.picklistValues) return [];
  return field.picklistValues
    .filter((v: any) => v.active)
    .map((v: any) => ({
      value: v.value,
      label: v.label,
      isDefault: v.defaultValue ?? false,
    }));
}

async function refreshAccessToken(supabase: any, settings: any, org?: any): Promise<string | null> {
  try {
    // Use org-level refresh token if available, fall back to per-property (legacy)
    const rawRefreshToken = org?.refresh_token || settings.refresh_token;
    const refreshToken = await decryptToken(rawRefreshToken);

    // Credential priority: org-level → per-property → env vars
    const clientId = org?.client_id || settings.client_id || Deno.env.get("SALESFORCE_CLIENT_ID");
    const clientSecret = org?.client_secret || settings.client_secret || Deno.env.get("SALESFORCE_CLIENT_SECRET");
    const loginUrl = org?.login_url || settings.login_url || "https://login.salesforce.com";

    if (!clientId || !clientSecret) {
      console.error("No Salesforce client credentials available for token refresh");
      return null;
    }

    const tokenUrl = `${loginUrl}/services/oauth2/token`;
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Token refresh failed:", response.status, errBody);
      return null;
    }

    const tokenData = await response.json();
    const encryptedAccessToken = await encryptToken(tokenData.access_token);
    const newExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Update org-level token (primary)
    if (org?.id) {
      await supabase
        .from("salesforce_orgs")
        .update({ access_token: encryptedAccessToken, token_expires_at: newExpiry, updated_at: now })
        .eq("id", org.id);
    }

    // Keep salesforce_settings in sync for backward compatibility
    await supabase
      .from("salesforce_settings")
      .update({ access_token: encryptedAccessToken, token_expires_at: newExpiry, updated_at: now })
      .eq("id", settings.id);

    return tokenData.access_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

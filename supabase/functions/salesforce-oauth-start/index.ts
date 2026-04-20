import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// PKCE helpers
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const jwtPayload = decodeJwtPayload(token);
    if (!jwtPayload?.sub || (jwtPayload.exp && jwtPayload.exp < Math.floor(Date.now() / 1000))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = jwtPayload.sub;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { propertyId, clientId: bodyClientId, clientSecret: bodyClientSecret, loginUrl: bodyLoginUrl } = await req.json();
    if (!propertyId) {
      return new Response(JSON.stringify({ error: "propertyId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin (filter in SQL to avoid enum type comparison in JS)
    const { data: adminRow } = await serviceClient
      .from("user_roles")
      .select("user_id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRow;

    // Verify property access — admins can access any property
    const { data: property } = await serviceClient
      .from("properties")
      .select("id, user_id")
      .eq("id", propertyId)
      .maybeSingle();

    if (!property || (!isAdmin && property.user_id !== userId)) {
      return new Response(JSON.stringify({ error: "Property not found or not owned" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the property owner's userId for org lookups (matters when admin connects for a client)
    const propertyOwnerId = property.user_id;

    // Save any credentials passed in the request body (admin bypassing RLS)
    if (bodyClientId || bodyClientSecret || bodyLoginUrl) {
      const credUpdate: Record<string, string> = { property_id: propertyId };
      if (bodyClientId) credUpdate.client_id = bodyClientId;
      if (bodyClientSecret) credUpdate.client_secret = bodyClientSecret;
      if (bodyLoginUrl) credUpdate.login_url = bodyLoginUrl;
      await serviceClient.from("salesforce_settings").upsert(credUpdate, { onConflict: "property_id" });
    }

    const { data: sfSettings } = await serviceClient
      .from("salesforce_settings")
      .select("login_url, salesforce_org_id, client_id")
      .eq("property_id", propertyId)
      .maybeSingle();

    // Body credentials override DB (they were just saved, but use them directly for clarity)
    let clientId: string | null | undefined = bodyClientId || sfSettings?.client_id || Deno.env.get("SALESFORCE_CLIENT_ID") || null;
    let loginUrl = bodyLoginUrl || sfSettings?.login_url;

    // If still no client_id, fall back to stored org credentials
    if (!clientId) {
      if (sfSettings?.salesforce_org_id) {
        const { data: org } = await serviceClient
          .from("salesforce_orgs")
          .select("client_id, login_url")
          .eq("id", sfSettings.salesforce_org_id)
          .maybeSingle();
        clientId = org?.client_id || null;
        loginUrl = loginUrl || org?.login_url;
      }
      if (!clientId) {
        const { data: existingOrg } = await serviceClient
          .from("salesforce_orgs")
          .select("client_id, login_url")
          .eq("user_id", propertyOwnerId)
          .not("client_id", "is", null)
          .limit(1)
          .maybeSingle();
        clientId = existingOrg?.client_id || null;
        loginUrl = loginUrl || existingOrg?.login_url;
      }
    }

    // Normalize login URL: strip path/trailing slashes, convert lightning.force.com → my.salesforce.com
    loginUrl = (loginUrl || "https://login.salesforce.com")
      .replace(/\/+$/, "")
      .replace(/^(https?:\/\/[^/]+).*$/, "$1") // strip any path
      .replace(/\.lightning\.force\.com$/i, ".my.salesforce.com");

    if (!clientId) {
      return new Response(JSON.stringify({ error: "Salesforce integration not configured. Please enter your Connected App credentials." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[oauth-start] propertyId=${propertyId} client_id_source=${Deno.env.get("SALESFORCE_CLIENT_ID") ? 'env' : 'db'} client_id_prefix=${clientId.slice(0, 10)}`);

    // Generate PKCE + CSRF
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const csrfToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Upsert settings row with CSRF token + code verifier
    const { error: upsertError } = await serviceClient
      .from("salesforce_settings")
      .upsert(
        {
          property_id: propertyId,
          pending_oauth_token: csrfToken,
          pending_oauth_expires_at: expiresAt,
          pending_code_verifier: codeVerifier,
        },
        { onConflict: "property_id" }
      );

    if (upsertError) {
      console.error("Error storing OAuth state:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to initiate OAuth" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Salesforce authorization URL with PKCE
    const redirectUri = `${supabaseUrl}/functions/v1/salesforce-oauth-callback`;
    const baseLoginUrl = loginUrl;
    const authUrl = new URL(`${baseLoginUrl}/services/oauth2/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "api refresh_token openid");
    authUrl.searchParams.set("state", `${propertyId}:${csrfToken}`);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

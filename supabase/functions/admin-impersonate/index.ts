import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { create } from "https://deno.land/x/djwt@v2.9.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeJwtPayload(jwt: string): { sub?: string } | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerPayload = decodeJwtPayload(authHeader.replace("Bearer ", ""));
    if (!callerPayload?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const jwtSecret = Deno.env.get("JWT_SECRET");

    if (!jwtSecret) {
      console.error("JWT_SECRET not available — set it via: supabase secrets set JWT_SECRET=<your-legacy-jwt-secret>");
      return new Response(JSON.stringify({ error: "JWT secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const { data: adminRow } = await serviceClient
      .from("user_roles")
      .select("user_id")
      .eq("user_id", callerPayload.sub)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "targetUserId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch target user profile
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("user_id, email, full_name, company_name")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Import HMAC key for JWT signing
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );

    const now = Math.floor(Date.now() / 1000);
    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: targetUserId,
        aud: "authenticated",
        role: "authenticated",
        iss: `${supabaseUrl}/auth/v1`,
        email: profile.email,
        iat: now,
        exp: now + 8 * 3600,
        is_impersonated: true,
        impersonated_by: callerPayload.sub,
        user_metadata: { full_name: profile.full_name, email_verified: true },
        app_metadata: { provider: "email", providers: ["email"] },
      },
      key,
    );

    return new Response(
      JSON.stringify({
        token,
        user: {
          id: profile.user_id,
          email: profile.email,
          name: profile.full_name || profile.email,
          company: profile.company_name || profile.full_name || profile.email,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("admin-impersonate error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

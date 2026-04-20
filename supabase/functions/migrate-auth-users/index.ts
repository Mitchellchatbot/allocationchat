import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Fetch all profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("user_id, email");

  if (profilesError) {
    return new Response(JSON.stringify({ error: profilesError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  console.log(`Setting password for ${profiles.length} users`);

  const results: {
    updated: string[];
    errors: { email: string; error: string }[];
  } = { updated: [], errors: [] };

  for (const profile of profiles) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      profile.user_id,
      { password: "ChangeMe123!" },
    );

    if (error) {
      console.error(`Error updating ${profile.email}: ${error.message}`);
      results.errors.push({ email: profile.email, error: error.message });
    } else {
      console.log(`Password set for: ${profile.email}`);
      results.updated.push(profile.email);
    }
  }

  const summary = {
    total: profiles.length,
    updated: results.updated.length,
    errors: results.errors.length,
    details: results,
  };

  console.log("Password update complete:", summary);

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
};

serve(handler);

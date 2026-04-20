import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerUserId = claimsData.user.id;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { name, email, password } = await req.json();

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

    if (existingUser) {
      // Check if already linked as co-owner
      const { data: existingLink } = await supabaseAdmin
        .from("account_co_owners")
        .select("id")
        .eq("owner_user_id", callerUserId)
        .eq("co_owner_user_id", existingUser.id)
        .maybeSingle();

      if (existingLink) {
        // Already linked — update the password and return success
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });
        console.log("Shared login password updated for existing co-owner:", cleanEmail);
        return new Response(JSON.stringify({
          success: true,
          message: "Shared login password updated successfully",
          userId: existingUser.id,
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exists but not linked — link as co-owner and update password
      const { error: linkError } = await supabaseAdmin.from("account_co_owners").insert({
        owner_user_id: callerUserId,
        co_owner_user_id: existingUser.id,
      });

      if (linkError) {
        console.error("Error linking existing user as co-owner:", linkError);
        return new Response(JSON.stringify({ error: "Failed to link existing account" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure they have the client role
      await supabaseAdmin.from("user_roles").delete().eq("user_id", existingUser.id).eq("role", "user");
      await supabaseAdmin.from("user_roles").upsert({ user_id: existingUser.id, role: "client" }, { onConflict: "user_id,role" });

      // Update password
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });

      console.log("Existing user linked as shared login:", cleanEmail, "for owner:", callerUserId);
      return new Response(JSON.stringify({
        success: true,
        message: "Existing account linked as shared login",
        userId: existingUser.id,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: cleanName },
    });

    if (createError || !newUser?.user) {
      console.error("Error creating user:", createError);
      return new Response(JSON.stringify({ error: createError?.message || "Failed to create user" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUser.user.id;

    // Set role to 'client' (delete default 'user' role, insert 'client')
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId).eq("role", "user");
    await supabaseAdmin.from("user_roles").upsert({ user_id: newUserId, role: "client" }, { onConflict: "user_id,role" });

    // Link as co-owner
    const { error: coOwnerError } = await supabaseAdmin.from("account_co_owners").insert({
      owner_user_id: callerUserId,
      co_owner_user_id: newUserId,
    });

    if (coOwnerError) {
      console.error("Error linking co-owner:", coOwnerError);
      // Clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: "Failed to link shared login" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Shared login created:", cleanEmail, "for owner:", callerUserId);

    return new Response(JSON.stringify({
      success: true,
      message: "Shared login created successfully",
      userId: newUserId,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in create-shared-login:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

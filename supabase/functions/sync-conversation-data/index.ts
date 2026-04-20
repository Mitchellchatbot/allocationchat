import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OLD_SUPABASE_URL = "https://qylckndenngvvaexosml.supabase.co";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const oldKey = Deno.env.get("OLD_SUPABASE_AUTH_TOKEN") ?? "";
  if (!oldKey) {
    return new Response(JSON.stringify({ error: "OLD_SUPABASE_AUTH_TOKEN secret not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // --- Fetch all conversation data from old project ---
  console.log("Fetching data from old Supabase project...");
  const res = await fetch(`${OLD_SUPABASE_URL}/functions/v1/push-conversation-data`, {
    headers: { Authorization: `Bearer ${oldKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(JSON.stringify({ error: `Old project fetch failed: ${text}` }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { tables } = await res.json();

  if (!tables) {
    return new Response(JSON.stringify({ error: "No tables returned from old project" }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const summary: Record<string, { inserted: number; skipped: number; errors: number }> = {};

  // --- Helper: upsert in batches of 500 ---
  const upsertBatch = async (
    table: string,
    rows: Record<string, unknown>[],
    conflictCol: string,
    pickCols: string[],
  ) => {
    if (!rows?.length) {
      summary[table] = { inserted: 0, skipped: 0, errors: 0 };
      return;
    }

    // Only keep columns that exist in the new schema
    const mapped = rows.map((r) =>
      Object.fromEntries(pickCols.filter((k) => k in r).map((k) => [k, r[k]]))
    );

    let inserted = 0;
    let errors = 0;
    const batchSize = 500;

    for (let i = 0; i < mapped.length; i += batchSize) {
      const batch = mapped.slice(i, i + batchSize);
      const { error, count } = await supabase
        .from(table)
        .upsert(batch, { onConflict: conflictCol, ignoreDuplicates: true, count: "exact" });

      if (error) {
        console.error(`Error upserting into ${table}:`, error.message);
        errors += batch.length;
      } else {
        inserted += count ?? 0;
      }
    }

    summary[table] = { inserted, skipped: mapped.length - inserted - errors, errors };
    console.log(`${table}: inserted=${inserted} skipped=${mapped.length - inserted - errors} errors=${errors}`);
  };

  // Order matters — FK chain: visitors → conversations → messages
  await upsertBatch("visitors", tables.visitors ?? [], "id", [
    "id", "property_id", "session_id", "name", "email",
    "browser_info", "location", "current_page", "created_at",
  ]);

  await upsertBatch("conversations", tables.conversations ?? [], "id", [
    "id", "property_id", "visitor_id", "assigned_agent_id",
    "status", "created_at", "updated_at",
  ]);

  await upsertBatch("messages", tables.messages ?? [], "id", [
    "id", "conversation_id", "sender_id", "sender_type",
    "content", "read", "created_at", "sequence_number",
  ]);

  console.log("Sync complete:", summary);

  return new Response(JSON.stringify({ ok: true, summary }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
};

serve(handler);

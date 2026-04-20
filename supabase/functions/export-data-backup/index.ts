import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeSQL(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) {
    const items = val.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(",");
    return `ARRAY[${items}]`;
  }
  if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    // Table export order (respecting foreign keys)
    const tables = [
      "profiles",
      "user_roles",
      "account_co_owners",
      "properties",
      "agents",
      "property_agents",
      "ai_agents",
      "ai_agent_properties",
      "visitors",
      "conversations",
      "messages",
      "notification_logs",
      "email_notification_settings",
      "slack_notification_settings",
      "salesforce_settings",
      "salesforce_exports",
      "two_factor_codes",
      "phi_audit_logs",
      "data_retention_settings",
      "page_analytics_events",
      "video_call_signals",
      "agent_complaints",
    ];

    let sql = `-- ============================================================\n`;
    sql += `-- DATA BACKUP EXPORT\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n`;
    sql += `-- Project: CareAssist / Live Reach\n`;
    sql += `-- ============================================================\n\n`;
    sql += `-- Disable triggers during import\nSET session_replication_role = 'replica';\n\n`;

    for (const table of tables) {
      // Fetch all rows (paginated for large tables)
      let allRows: Record<string, unknown>[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .range(from, from + pageSize - 1);
        
        if (error) {
          sql += `-- ERROR fetching ${table}: ${error.message}\n\n`;
          break;
        }
        if (!data || data.length === 0) break;
        allRows = allRows.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      sql += `-- --- ${table} (${allRows.length} rows) ---\n`;
      
      if (allRows.length === 0) {
        sql += `-- (empty table)\n\n`;
        continue;
      }

      const columns = Object.keys(allRows[0]);
      const colList = columns.map((c) => `"${c}"`).join(", ");

      // Batch inserts in groups of 50
      for (let i = 0; i < allRows.length; i += 50) {
        const batch = allRows.slice(i, i + 50);
        sql += `INSERT INTO public."${table}" (${colList}) VALUES\n`;
        const valueRows = batch.map((row) => {
          const vals = columns.map((col) => escapeSQL(row[col]));
          return `  (${vals.join(", ")})`;
        });
        sql += valueRows.join(",\n");
        sql += `\nON CONFLICT DO NOTHING;\n\n`;
      }
    }

    sql += `-- Re-enable triggers\nSET session_replication_role = 'origin';\n`;
    sql += `\n-- END OF DATA BACKUP\n`;

    return new Response(sql, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="data-backup-${new Date().toISOString().slice(0, 10)}.sql"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

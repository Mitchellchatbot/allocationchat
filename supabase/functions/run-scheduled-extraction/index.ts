// Cron-triggered: extracts visitor info for conversations with recent visitor activity
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();

  // Find conversations where visitor was active in the last 5 min
  // and extraction hasn't run in the last 1 min
  const { data: convos, error } = await supabase
    .from("conversations")
    .select("id, visitor_id")
    .gt("last_visitor_message_at", fiveMinAgo)
    .or(`last_extraction_at.is.null,last_extraction_at.lt.${oneMinAgo}`)
    .neq("status", "closed")
    .limit(50);

  if (error) {
    console.error("run-scheduled-extraction: query error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Don't return early — still need to process the Salesforce export queue below

  const convoList = convos || [];
  console.log(`run-scheduled-extraction: processing ${convoList.length} conversations`);

  let processed = 0;

  for (const conv of convoList) {
    try {
      // Get conversation history
      const { data: msgs } = await supabase
        .from("messages")
        .select("sender_type, content")
        .eq("conversation_id", conv.id)
        .order("sequence_number", { ascending: true })
        .limit(50);

      if (!msgs || msgs.length === 0) continue;

      const conversationHistory = msgs.map((m: { sender_type: string; content: string }) => ({
        role: m.sender_type === "visitor" ? "user" : "assistant",
        content: m.content,
      }));

      // Call extract-visitor-info synchronously so we can stamp last_extraction_at after
      const res = await fetch(`${supabaseUrl}/functions/v1/extract-visitor-info`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visitorId: conv.visitor_id, conversationHistory }),
      });

      if (!res.ok) {
        console.error(`Extraction failed for conv ${conv.id}: ${res.status}`);
        continue;
      }

      // Stamp last_extraction_at
      await supabase
        .from("conversations")
        .update({ last_extraction_at: new Date().toISOString() })
        .eq("id", conv.id);

      processed++;
    } catch (e) {
      console.error(`Extraction error for conv ${conv.id}:`, e);
    }
  }

  console.log(`run-scheduled-extraction: completed ${processed}/${convoList.length}`);

  // ── Salesforce export queue processor ──────────────────────────────────────
  // Step 1: Migrate any conversations with the legacy sf_export_ready_at flag
  //         into the persistent queue (catches anything not yet enqueued directly).
  let exported = 0;
  let retried = 0;
  let abandoned = 0;
  try {
    const fiveMinAgoForExport = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: readyConvos } = await supabase
      .from("conversations")
      .select("id, property_id, visitor_id, sf_export_trigger")
      .not("sf_export_ready_at", "is", null)
      .lt("last_visitor_message_at", fiveMinAgoForExport)
      .limit(20);

    if (readyConvos && readyConvos.length > 0) {
      for (const rc of readyConvos) {
        const trigger = rc.sf_export_trigger || 'phone';
        // Plain insert — partial unique index prevents ON CONFLICT upsert syntax.
        await supabase
          .from("salesforce_export_queue")
          .insert({
            property_id: rc.property_id,
            visitor_id: rc.visitor_id,
            conversation_id: rc.id,
            trigger_type: trigger,
            status: 'pending',
            next_attempt_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .then(({ error }) => { if (error && (error as any).code !== '23505') console.error('Queue insert error:', error); });

        // Clear the legacy flag now that it's safely in the queue
        await supabase
          .from("conversations")
          .update({ sf_export_ready_at: null, sf_export_trigger: null })
          .eq("id", rc.id);
      }
    }
  } catch (migErr) {
    console.error("run-scheduled-extraction: flag migration error", migErr);
  }

  // Step 2: Process the queue — pick up pending + failed rows that are due
  try {
    const now = new Date().toISOString();

    const { data: queueRows, error: queueErr2 } = await supabase
      .from("salesforce_export_queue")
      .select("id, property_id, visitor_id, conversation_id, trigger_type, attempts, max_attempts")
      .in("status", ["pending", "failed"])
      .lte("next_attempt_at", now)
      .order("next_attempt_at", { ascending: true })
      .limit(20);

    console.log(`SF queue query: rows=${queueRows?.length ?? 'null'}, error=${JSON.stringify(queueErr2)}, now=${now}`);

    if (queueRows && queueRows.length > 0) {
      console.log(`run-scheduled-extraction: processing ${queueRows.length} queued SF exports`);

      for (const row of queueRows) {
        const trigger = row.trigger_type || 'phone';
        const settingKeyMap: Record<string, string | null> = {
          phone: 'auto_export_on_phone_detected',
          insurance: 'auto_export_on_insurance_detected',
          escalation: 'auto_export_on_escalation',
          conversation_end: 'auto_export_on_conversation_end',
          manual: null, // always export — user explicitly requested
        };
        const settingKey = settingKeyMap[trigger] ?? 'auto_export_on_phone_detected';

        try {
          const { data: sf } = await supabase
            .from("salesforce_settings")
            .select("enabled, instance_url, salesforce_org_id, auto_export_on_phone_detected, auto_export_on_insurance_detected, auto_export_on_escalation, auto_export_on_conversation_end")
            .eq("property_id", row.property_id)
            .maybeSingle();

          const settingEnabled = settingKey === null ? true : (sf as any)?.[settingKey];

          // For conversation_end: only export if visitor has data matching what the property has toggled on.
          // (phone_detected or insurance_detected must be on AND visitor must have that data.)
          // This prevents exporting empty leads from conversations where nothing useful was captured.
          if (trigger === 'conversation_end' && settingEnabled) {
            const { data: visitor } = await supabase
              .from("visitors")
              .select("phone, insurance_info")
              .eq("id", row.visitor_id)
              .maybeSingle();

            const hasPhone = !!(visitor?.phone);
            const hasInsurance = !!(visitor?.insurance_info);
            const wantsPhone = !!(sf as any)?.auto_export_on_phone_detected;
            const wantsInsurance = !!(sf as any)?.auto_export_on_insurance_detected;

            const hasRelevantData = (wantsPhone && hasPhone) || (wantsInsurance && hasInsurance);
            if (!hasRelevantData) {
              await supabase
                .from("salesforce_export_queue")
                .update({ status: 'abandoned', last_error: 'No qualifying data for enabled triggers', updated_at: new Date().toISOString() })
                .eq("id", row.id);
              abandoned++;
              console.log(`SF export queue: silently abandoned conversation_end for ${row.visitor_id} — no phone/insurance data`);
              continue;
            }
          }

          if (!sf?.enabled || !settingEnabled || (!sf?.salesforce_org_id && !sf?.instance_url)) {
            const reason = !sf ? 'No Salesforce settings row' : !sf.enabled ? 'Salesforce disabled' : !settingEnabled ? `Auto-export off (${settingKey ?? trigger})` : 'No org or instance_url';
            await supabase
              .from("salesforce_export_queue")
              .update({ status: 'abandoned', last_error: reason, updated_at: new Date().toISOString() })
              .eq("id", row.id);
            abandoned++;
            console.warn(`SF export queue: abandoned ${row.visitor_id} (${row.property_id}) — ${reason}`);
            // Only alert on real connectivity problems — not when an auto-export setting is simply off
            const isRealProblem = !sf || !sf.enabled || (!sf.salesforce_org_id && !sf.instance_url);
            const adminWebhook = Deno.env.get("ADMIN_SLACK_WEBHOOK_URL");
            if (isRealProblem && adminWebhook) {
              const { data: propInfo } = await supabase.from("properties").select("name, domain").eq("id", row.property_id).maybeSingle();
              const propertyLabel = propInfo?.name || propInfo?.domain || row.property_id;
              await fetch(adminWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: `⚠️ *Salesforce export skipped* — lead queued for *${propertyLabel}* but Salesforce isn't properly connected.\n*Reason:* ${reason}\n*Trigger:* ${row.trigger_type}`,
                }),
              }).catch(e => console.error("Slack alert failed:", e));
            }
            continue;
          }

          // Mark as being attempted
          await supabase
            .from("salesforce_export_queue")
            .update({ last_attempted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("id", row.id);

          const res = await fetch(`${supabaseUrl}/functions/v1/salesforce-export-leads`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              propertyId: row.property_id,
              visitorIds: [row.visitor_id],
              _serviceRoleExport: true,
            }),
          });

          let exportResult: { exported?: number; errors?: string[] } = {};
          try { exportResult = await res.json(); } catch { /* ignore parse error */ }

          const succeeded = res.ok && (exportResult.exported ?? 0) > 0;

          if (succeeded) {
            await supabase
              .from("salesforce_export_queue")
              .update({
                status: 'success',
                exported_at: new Date().toISOString(),
                attempts: row.attempts + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", row.id);
            exported++;
            console.log(`SF export queue: success for visitor ${row.visitor_id} (trigger: ${trigger})`);
          } else {
            const newAttempts = row.attempts + 1;
            const maxAttempts = row.max_attempts ?? 5;
            const giveUp = newAttempts >= maxAttempts;

            // Exponential backoff: 5min, 15min, 1h, 4h, 12h
            const backoffMinutes = [5, 15, 60, 240, 720];
            const backoffMs = (backoffMinutes[Math.min(newAttempts - 1, backoffMinutes.length - 1)] ?? 720) * 60 * 1000;
            const nextAttempt = new Date(Date.now() + backoffMs).toISOString();

            const errorMsg = exportResult.errors?.join('; ')
              ?? `HTTP ${res.status}`;

            await supabase
              .from("salesforce_export_queue")
              .update({
                status: giveUp ? 'abandoned' : 'failed',
                attempts: newAttempts,
                next_attempt_at: nextAttempt,
                last_error: errorMsg.substring(0, 1000),
                updated_at: new Date().toISOString(),
              })
              .eq("id", row.id);

            if (giveUp) {
              abandoned++;
              // Log abandoned export so it surfaces in the notification log
              await supabase.from("notification_logs").insert({
                property_id: row.property_id,
                conversation_id: row.conversation_id,
                notification_type: "export_failed",
                channel: "in_app",
                recipient: "system",
                recipient_type: "system",
                status: "failed",
                error_message: `Abandoned after ${newAttempts} attempts. Last error: ${errorMsg}`.substring(0, 500),
              });
              console.error(`SF export queue: ABANDONED visitor ${row.visitor_id} after ${newAttempts} attempts. Last error: ${errorMsg}`);

              // Alert admin Slack — only fires to the internal org channel, never to clients
              const adminWebhook = Deno.env.get("ADMIN_SLACK_WEBHOOK_URL");
              if (adminWebhook) {
                const { data: propInfo } = await supabase
                  .from("properties")
                  .select("name, domain")
                  .eq("id", row.property_id)
                  .maybeSingle();

                const { data: visitorInfo } = await supabase
                  .from("visitors")
                  .select("name, email, phone")
                  .eq("id", row.visitor_id)
                  .maybeSingle();

                const propertyLabel = propInfo?.name || propInfo?.domain || row.property_id;
                const visitorLabel = visitorInfo?.name || visitorInfo?.email || visitorInfo?.phone || "Unknown visitor";

                await fetch(adminWebhook, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    blocks: [
                      {
                        type: "header",
                        text: { type: "plain_text", text: "🚨 Salesforce Lead Export Failed", emoji: true },
                      },
                      {
                        type: "section",
                        fields: [
                          { type: "mrkdwn", text: `*Property:*\n${propertyLabel}` },
                          { type: "mrkdwn", text: `*Visitor:*\n${visitorLabel}` },
                          { type: "mrkdwn", text: `*Trigger:*\n${row.trigger_type}` },
                          { type: "mrkdwn", text: `*Attempts:*\n${newAttempts}` },
                        ],
                      },
                      {
                        type: "section",
                        text: { type: "mrkdwn", text: `*Error:*\n\`\`\`${errorMsg.slice(0, 500)}\`\`\`` },
                      },
                    ],
                  }),
                }).catch(e => console.error("Admin Slack alert failed:", e));
              }
            } else {
              retried++;
              console.error(`SF export queue: failed attempt ${newAttempts}/${maxAttempts} for visitor ${row.visitor_id}. Next retry at ${nextAttempt}. Error: ${errorMsg}`);
            }
          }
        } catch (rowErr) {
          // Unexpected error processing this row — increment attempts and reschedule
          const newAttempts = row.attempts + 1;
          const giveUp = newAttempts >= (row.max_attempts ?? 5);
          await supabase
            .from("salesforce_export_queue")
            .update({
              status: giveUp ? 'abandoned' : 'failed',
              attempts: newAttempts,
              next_attempt_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              last_error: String(rowErr).substring(0, 1000),
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
          console.error(`SF export queue: unexpected error for row ${row.id}:`, rowErr);
        }
      }
    }
  } catch (queueErr) {
    console.error("run-scheduled-extraction: queue processing error", queueErr);
  }

  console.log(`run-scheduled-extraction: completed ${processed}/${convoList.length} extractions, ${exported} exported, ${retried} retried, ${abandoned} abandoned`);

  return new Response(JSON.stringify({ processed, total: convoList.length, exported, retried, abandoned }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

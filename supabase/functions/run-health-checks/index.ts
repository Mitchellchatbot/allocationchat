import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-health-check-secret",
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface CheckResult {
  name: string;
  category: "functional" | "integration" | "performance" | "database" | "connectivity";
  status: "pass" | "fail" | "warn";
  latencyMs: number;
  details?: any;
}

interface RequestBody {
  tests?: string[];          // filter: ["functional","integration","performance","database","connectivity"]
  concurrency?: number;      // for perf tests, default 10
  slackWebhookUrl?: string;  // optional direct Slack webhook override
  propertyId?: string;       // optional property for integration tests
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = () => Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = () => Deno.env.get("SUPABASE_ANON_KEY")!;

// ─── Salesforce token decryption (mirrors salesforce-describe-lead) ───────────

async function sfDeriveKey(): Promise<CryptoKey> {
  const secret = SERVICE_KEY();
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("salesforce-token-encryption-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

async function sfDecryptToken(encrypted: string): Promise<string> {
  if (!encrypted.startsWith("enc:")) return encrypted;
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const iv = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
  const key = await sfDeriveKey();
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plain);
}

function fnUrl(name: string): string {
  return `${SUPABASE_URL()}/functions/v1/${name}`;
}

/** Run an array of async tasks in batches, with a delay between each batch */
async function runBatched<T>(
  tasks: (() => Promise<T>)[],
  batchSize = 5,
  delayMs = 300
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(t => t()));
    results.push(...batchResults);
    if (i + batchSize < tasks.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return results;
}

async function timedFetch(
  url: string,
  options?: RequestInit
): Promise<{ response: Response; latencyMs: number }> {
  const start = performance.now();
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(15000),
    });
    const latencyMs = Math.round(performance.now() - start);
    return { response, latencyMs };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    throw Object.assign(err as Error, { latencyMs });
  }
}

// ─── Test Suites ─────────────────────────────────────────────────────────────

// Only probe the highest-impact functions — Supabase caps outbound subrequests
// per invocation, so we keep this list lean and cover secondary functions via
// the integration + connectivity tests below.
const ALL_EDGE_FUNCTIONS = [
  "chat-ai",
  "check-subscription",
  "extract-visitor-info",
  "run-scheduled-extraction",
  "salesforce-export-leads",
  "send-email-notification",
  "send-slack-notification",
  "widget-bootstrap",
  "widget-save-message",
];

/** Functional: probe each edge function with OPTIONS (CORS preflight) to verify it's alive */
async function runFunctionalTests(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const probes = ALL_EDGE_FUNCTIONS.map((name) => async () => {
    try {
      const { response, latencyMs } = await timedFetch(fnUrl(name), {
        method: "OPTIONS",
      });
      await response.text(); // consume body
      const status: CheckResult["status"] =
        response.status < 500 ? "pass" : "fail";
      results.push({
        name: `fn-alive:${name}`,
        category: "functional",
        status,
        latencyMs,
        details: { httpStatus: response.status },
      });
    } catch (err: any) {
      results.push({
        name: `fn-alive:${name}`,
        category: "functional",
        status: "fail",
        latencyMs: err.latencyMs ?? 0,
        details: { error: err.message },
      });
    }
  });

  await runBatched(probes, 1, 5000);
  return results;
}

/** Integration: test key services end-to-end */
async function runIntegrationTests(propertyId?: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const NULL_UUID = "00000000-0000-0000-0000-000000000000";
  const testPropId = propertyId || NULL_UUID;

  // Helper: push result, treating 2xx as pass, 4xx as warn (alive but rejected test data), 5xx as fail
  const push = (name: string, httpStatus: number, latencyMs: number, bodyPreview: string) => {
    const status: CheckResult["status"] = httpStatus < 400 ? "pass" : httpStatus < 500 ? "warn" : "fail";
    results.push({ name, category: "integration", status, latencyMs, details: { httpStatus, bodyPreview } });
  };

  // 1. Widget bootstrap — requires propertyId + sessionId
  try {
    const { response, latencyMs } = await timedFetch(fnUrl("widget-bootstrap"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: testPropId, sessionId: NULL_UUID }),
    });
    push("integration:widget-bootstrap", response.status, latencyMs, (await response.text()).slice(0, 200));
  } catch (err: any) {
    results.push({ name: "integration:widget-bootstrap", category: "integration", status: "fail", latencyMs: err.latencyMs ?? 0, details: { error: err.message } });
  }

  // 2. AI chat — requires messages array
  try {
    const { response, latencyMs } = await timedFetch(fnUrl("chat-ai"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "health check ping" }], propertyContext: "" }),
    });
    push("integration:chat-ai", response.status, latencyMs, (await response.text()).slice(0, 200));
  } catch (err: any) {
    results.push({ name: "integration:chat-ai", category: "integration", status: "fail", latencyMs: err.latencyMs ?? 0, details: { error: err.message } });
  }

  // 3. Email notification — unknown property should skip gracefully (not 5xx)
  try {
    const { response, latencyMs } = await timedFetch(fnUrl("send-email-notification"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: NULL_UUID, eventType: "new_conversation", conversationId: NULL_UUID }),
    });
    push("integration:email-notification", response.status, latencyMs, (await response.text()).slice(0, 200));
  } catch (err: any) {
    results.push({ name: "integration:email-notification", category: "integration", status: "fail", latencyMs: err.latencyMs ?? 0, details: { error: err.message } });
  }

  // 4. Slack notification — unknown property should skip gracefully (not 5xx)
  try {
    const { response, latencyMs } = await timedFetch(fnUrl("send-slack-notification"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: NULL_UUID, eventType: "new_conversation", conversationId: NULL_UUID }),
    });
    push("integration:slack-notification", response.status, latencyMs, (await response.text()).slice(0, 200));
  } catch (err: any) {
    results.push({ name: "integration:slack-notification", category: "integration", status: "fail", latencyMs: err.latencyMs ?? 0, details: { error: err.message } });
  }

  // 5. Visitor location — requires visitorId
  try {
    const { response, latencyMs } = await timedFetch(fnUrl("get-visitor-location"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: NULL_UUID }),
    });
    push("integration:visitor-location", response.status, latencyMs, (await response.text()).slice(0, 200));
  } catch (err: any) {
    results.push({ name: "integration:visitor-location", category: "integration", status: "fail", latencyMs: err.latencyMs ?? 0, details: { error: err.message } });
  }

  return results;
}

// ─── Perf helpers ────────────────────────────────────────────────────────────

async function concurrentLoad(
  name: string,
  count: number,
  makeRequest: () => Promise<{ latencyMs: number; ok: boolean }>
): Promise<CheckResult> {
  try {
    const start = performance.now();
    const rawResults = await Promise.all(
      Array.from({ length: count }, makeRequest)
    );
    const totalMs = Math.round(performance.now() - start);

    const latencies = rawResults.map((r) => r.latencyMs).sort((a, b) => a - b);
    const failures = rawResults.filter((r) => !r.ok).length;
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const max = latencies[latencies.length - 1];
    const errorRate = Math.round((failures / count) * 100);

    const status: CheckResult["status"] =
      failures / count > 0.05
        ? "fail"
        : p95 < 4000
        ? "pass"
        : p95 < 8000
        ? "warn"
        : "fail";

    return {
      name,
      category: "performance",
      status,
      latencyMs: totalMs,
      details: { concurrency: count, p50, p95, p99, max, failures, errorRate: `${errorRate}%`, totalMs },
    };
  } catch (err: any) {
    return { name, category: "performance", status: "fail", latencyMs: 0, details: { error: err.message } };
  }
}

/** Performance: latency benchmarks and concurrent load */
async function runPerformanceTests(_concurrency: number): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const NULL_UUID = "00000000-0000-0000-0000-000000000000";

  // 1. Widget bootstrap — single request baseline latency
  try {
    const { latencyMs } = await timedFetch(fnUrl("widget-bootstrap"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: NULL_UUID }),
    });
    results.push({
      name: "perf:widget-bootstrap-latency",
      category: "performance",
      status: latencyMs < 1000 ? "pass" : latencyMs < 2500 ? "warn" : "fail",
      latencyMs,
      details: { thresholds: { pass: "<1s", warn: "<2.5s", fail: ">=2.5s" } },
    });
  } catch (err: any) {
    results.push({ name: "perf:widget-bootstrap-latency", category: "performance", status: "fail", latencyMs: err.latencyMs ?? 0, details: { error: err.message } });
  }

  // 2. Widget bootstrap — tiered concurrent load (10x, 25x, 50x)
  const bootstrapRequest = () =>
    timedFetch(fnUrl("widget-bootstrap"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: NULL_UUID }),
    }).then(async (r) => {
      await r.response.text();
      return { latencyMs: r.latencyMs, ok: r.response.status < 500 };
    }).catch((err: any) => ({ latencyMs: err.latencyMs ?? 15000, ok: false }));

  // Stay at 10x max to avoid Supabase project-level rate limits
  results.push(await concurrentLoad("perf:widget-bootstrap-10x", 10, bootstrapRequest));

  // 3. Chat AI — single request baseline latency
  await new Promise((r) => setTimeout(r, 3000));
  try {
    const { latencyMs, response } = await timedFetch(fnUrl("chat-ai"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: NULL_UUID, userMessage: "latency test", propertyId: NULL_UUID }),
    });
    await response.text();
    results.push({
      name: "perf:chat-ai-latency",
      category: "performance",
      status: latencyMs < 5000 ? "pass" : latencyMs < 10000 ? "warn" : "fail",
      latencyMs,
      details: { thresholds: { pass: "<5s", warn: "<10s", fail: ">=10s" } },
    });
  } catch (err: any) {
    results.push({ name: "perf:chat-ai-latency", category: "performance", status: "fail", latencyMs: err.latencyMs ?? 0, details: { error: err.message } });
  }


  return results;
}

/** Database: sanity checks on data health */
async function runDatabaseTests(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const supabase = createClient(SUPABASE_URL(), SERVICE_KEY());

  // 1. Total conversations count
  const start1 = performance.now();
  const { count: convCount, error: convErr } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true });
  results.push({
    name: "db:conversations-count",
    category: "database",
    status: convErr ? "fail" : "pass",
    latencyMs: Math.round(performance.now() - start1),
    details: { count: convCount, error: convErr?.message },
  });

  // 2. Total visitors count
  const start2 = performance.now();
  const { count: visitorCount, error: visErr } = await supabase
    .from("visitors")
    .select("*", { count: "exact", head: true });
  results.push({
    name: "db:visitors-count",
    category: "database",
    status: visErr ? "fail" : "pass",
    latencyMs: Math.round(performance.now() - start2),
    details: { count: visitorCount, error: visErr?.message },
  });

  // 3. Total messages count
  const start3 = performance.now();
  const { count: msgCount, error: msgErr } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true });
  results.push({
    name: "db:messages-count",
    category: "database",
    status: msgErr ? "fail" : "pass",
    latencyMs: Math.round(performance.now() - start3),
    details: { count: msgCount, error: msgErr?.message },
  });

  // 4. Total properties count
  const start4 = performance.now();
  const { count: propCount, error: propErr } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true });
  results.push({
    name: "db:properties-count",
    category: "database",
    status: propErr ? "fail" : "pass",
    latencyMs: Math.round(performance.now() - start4),
    details: { count: propCount, error: propErr?.message },
  });

  // 5. Stale active conversations (active but no message in >24h)
  const start5 = performance.now();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: staleCount, error: staleErr } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .lt("updated_at", cutoff);
  results.push({
    name: "db:stale-active-conversations",
    category: "database",
    status: staleErr
      ? "fail"
      : (staleCount ?? 0) > 50
        ? "warn"
        : "pass",
    latencyMs: Math.round(performance.now() - start5),
    details: { staleCount, threshold: 50, error: staleErr?.message },
  });

  // 6. Recent notification logs (verify system is generating notifications)
  const start6 = performance.now();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentNotifs, error: notifErr } = await supabase
    .from("notification_logs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", oneHourAgo);
  results.push({
    name: "db:recent-notifications",
    category: "database",
    status: notifErr ? "fail" : "pass",
    latencyMs: Math.round(performance.now() - start6),
    details: { countLastHour: recentNotifs, error: notifErr?.message },
  });

  return results;
}

// ─── Connectivity Tests ───────────────────────────────────────────────────────

/** Connectivity: check Slack webhook and Salesforce session health per property */
async function runConnectivityTests(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const supabase = createClient(SUPABASE_URL(), SERVICE_KEY());

  // Fetch all properties with their names
  const { data: properties, error: propErr } = await supabase
    .from("properties")
    .select("id, name");

  if (propErr || !properties) {
    results.push({
      name: "connectivity:properties-fetch",
      category: "connectivity",
      status: "fail",
      latencyMs: 0,
      details: { error: propErr?.message },
    });
    return results;
  }

  // Fetch all Slack and Salesforce settings (no .in() filter — avoids URL length limits with large property sets)
  const [{ data: slackSettings }, { data: sfSettings }, { data: sfOrgs }] = await Promise.all([
    supabase
      .from("slack_notification_settings")
      .select("property_id, enabled, incoming_webhook_url, legacy_webhook_url, access_token"),
    supabase
      .from("salesforce_settings")
      .select("property_id, enabled, access_token, instance_url, token_expires_at, salesforce_org_id"),
    supabase
      .from("salesforce_orgs")
      .select("id, instance_url, access_token"),
  ]);

  const slackMap = new Map((slackSettings as any[] || []).map((s: any) => [s.property_id, s]));
  const sfMap = new Map((sfSettings as any[] || []).map((s: any) => [s.property_id, s]));
  const orgsMap = new Map((sfOrgs as any[] || []).map((o: any) => [o.id, o]));

  const props = properties as { id: string; name: string }[];

  // ── Slack: one check per property (each has its own token/webhook) ──
  const slackChecks = props.map((prop) => async () => {
    const slack = slackMap.get(prop.id);
    const propLabel = prop.name || prop.id;

    if (!slack) {
      results.push({ name: `connectivity:slack:${propLabel}`, category: "connectivity", status: "warn", latencyMs: 0, details: { property: propLabel, reason: "no_row" } });
    } else if (!slack.enabled) {
      results.push({ name: `connectivity:slack:${propLabel}`, category: "connectivity", status: "warn", latencyMs: 0, details: { property: propLabel, reason: "disabled" } });
    } else if (slack.access_token) {
      const start = performance.now();
      try {
        const res = await fetch("https://slack.com/api/auth.test", {
          method: "POST",
          headers: { Authorization: `Bearer ${slack.access_token}` },
          signal: AbortSignal.timeout(8000),
        });
        const latencyMs = Math.round(performance.now() - start);
        const body = await res.json().catch(() => ({}));
        results.push({ name: `connectivity:slack:${propLabel}`, category: "connectivity", status: body.ok ? "pass" : "fail", latencyMs, details: { property: propLabel, method: "oauth_token", ...(body.error ? { reason: body.error } : {}) } });
      } catch (err: any) {
        results.push({ name: `connectivity:slack:${propLabel}`, category: "connectivity", status: "fail", latencyMs: Math.round(performance.now() - start), details: { property: propLabel, error: err.message } });
      }
    } else {
      const webhookUrl = slack.incoming_webhook_url || slack.legacy_webhook_url;
      const isValid = typeof webhookUrl === "string" && webhookUrl.startsWith("https://hooks.slack.com/");
      results.push({ name: `connectivity:slack:${propLabel}`, category: "connectivity", status: isValid ? "pass" : "fail", latencyMs: 0, details: { property: propLabel, method: "webhook_url", ...(isValid ? {} : { reason: "invalid or missing webhook URL" }) } });
    }
  });

  // ── Salesforce: deduplicate by instance_url — one API call per unique org ──
  // Properties on the same account often share one Salesforce org; hitting it N times
  // would waste API quota and risk rate limiting.
  const sfByInstance = new Map<string, { sf: any; propLabels: string[] }>();

  for (const prop of props) {
    const sf = sfMap.get(prop.id);
    const propLabel = prop.name || prop.id;

    if (!sf) {
      results.push({ name: `connectivity:salesforce:${propLabel}`, category: "connectivity", status: "warn", latencyMs: 0, details: { property: propLabel, reason: "no_row" } });
      continue;
    }
    if (!sf.enabled) {
      results.push({ name: `connectivity:salesforce:${propLabel}`, category: "connectivity", status: "warn", latencyMs: 0, details: { property: propLabel, reason: "disabled" } });
      continue;
    }

    // Resolve authoritative credentials: shared org takes priority over direct token
    let instanceUrl: string | null = null;
    let accessToken: string | null = null;

    if (sf.salesforce_org_id) {
      const org = orgsMap.get(sf.salesforce_org_id);
      instanceUrl = org?.instance_url ?? null;
      accessToken = org?.access_token ?? null;
    } else {
      instanceUrl = sf.instance_url ?? null;
      accessToken = sf.access_token ?? null;
    }

    if (!instanceUrl || !accessToken) {
      // Can't determine connection state confidently — skip, don't warn
      continue;
    }

    // Group by instance_url so we only call each org once
    if (!sfByInstance.has(instanceUrl)) {
      sfByInstance.set(instanceUrl, { sf: { ...sf, instance_url: instanceUrl, access_token: accessToken }, propLabels: [] });
    }
    sfByInstance.get(instanceUrl)!.propLabels.push(propLabel);
  }

  const sfChecks = Array.from(sfByInstance.values()).map(({ sf, propLabels }) => async () => {
    const start = performance.now();
    try {
      const accessToken = await sfDecryptToken(sf.access_token);
      const res = await fetch(`${sf.instance_url}/services/data/v59.0/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8000),
      });
      const latencyMs = Math.round(performance.now() - start);
      await res.text();
      const status: CheckResult["status"] = res.status === 200 ? "pass" : res.status === 401 ? "warn" : "fail";
      const extra = res.status === 401 ? { reason: "token_expired_or_invalid" } : {};
      // Fan result out to every property sharing this org
      for (const propLabel of propLabels) {
        results.push({ name: `connectivity:salesforce:${propLabel}`, category: "connectivity", status, latencyMs, details: { property: propLabel, httpStatus: res.status, ...(propLabels.length > 1 ? { sharedOrg: sf.instance_url } : {}), ...extra } });
      }
    } catch (err: any) {
      for (const propLabel of propLabels) {
        results.push({ name: `connectivity:salesforce:${propLabel}`, category: "connectivity", status: "fail", latencyMs: Math.round(performance.now() - start), details: { property: propLabel, error: err.message } });
      }
    }
  });

  await runBatched([...slackChecks, ...sfChecks], 4, 250);
  return results;
}

// ─── Slack Reporting ─────────────────────────────────────────────────────────

async function sendSlackReport(
  results: CheckResult[],
  runId: string,
  durationMs: number,
  webhookUrl?: string
) {
  // Only send to the internal Care Assist webhook — never touch client Slack connections
  const targetWebhook = webhookUrl || Deno.env.get("HEALTH_CHECK_SLACK_WEBHOOK");

  if (!targetWebhook) {
    console.log("No internal Slack webhook configured — skipping Slack notification");
    return;
  }

  const payload = buildSlackPayload(results, runId, durationMs);
  await fetch(targetWebhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function buildSlackPayload(results: CheckResult[], runId: string, durationMs: number) {
  const total = results.length;
  const passed = results.filter((r) => r.status === "pass").length;
  const warned = results.filter((r) => r.status === "warn").length;
  const failed = results.filter((r) => r.status === "fail").length;

  const emoji = failed > 0 ? "🔴" : warned > 0 ? "🟡" : "🟢";
  const headerText = `${emoji} Health Check Report`;

  const failedTests = results.filter((r) => r.status === "fail");
  const warnTests = results.filter((r) => r.status === "warn");

  const blocks: any[] = [
    {
      type: "header",
      text: { type: "plain_text", text: headerText, emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Total Tests:*\n${total}` },
        { type: "mrkdwn", text: `*Duration:*\n${(durationMs / 1000).toFixed(1)}s` },
        { type: "mrkdwn", text: `*✅ Pass:* ${passed}` },
        { type: "mrkdwn", text: `*❌ Fail:* ${failed}  |  *⚠️ Warn:* ${warned}` },
      ],
    },
  ];

  if (failedTests.length > 0) {
    const failList = failedTests
      .slice(0, 10)
      .map((t) => `• \`${t.name}\` — ${t.latencyMs}ms`)
      .join("\n");
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*❌ Failed Tests:*\n${failList}`,
      },
    });
  }

  if (warnTests.length > 0) {
    const warnList = warnTests
      .slice(0, 5)
      .map((t) => `• \`${t.name}\` — ${t.latencyMs}ms`)
      .join("\n");
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚠️ Warnings:*\n${warnList}`,
      },
    });
  }

  // Perf stats if any performance tests ran
  const perfTests = results.filter((r) => r.category === "performance");
  if (perfTests.length > 0) {
    const perfLines = perfTests
      .map((t) => {
        const detail = t.details?.p95
          ? `p50=${t.details.p50}ms p95=${t.details.p95}ms max=${t.details.max}ms`
          : `${t.latencyMs}ms`;
        return `• \`${t.name}\` — ${detail}`;
      })
      .join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*📊 Performance:*\n${perfLines}` },
    });
  }

  // Connectivity summary if any connectivity tests ran
  const connTests = results.filter((r) => r.category === "connectivity");
  if (connTests.length > 0) {
    const connPass = connTests.filter((r) => r.status === "pass").length;
    const connFail = connTests.filter((r) => r.status === "fail").length;
    const connWarn = connTests.filter((r) => r.status === "warn").length;
    const failedConn = connTests.filter((r) => r.status === "fail");

    let connText = `*🔌 Connectivity:* ${connPass} pass · ${connFail} fail · ${connWarn} not configured`;
    if (failedConn.length > 0) {
      connText += "\n" + failedConn
        .slice(0, 8)
        .map((t) => {
          const reason = t.details?.reason ? ` (${t.details.reason})` : "";
          return `• \`${t.name}\`${reason}`;
        })
        .join("\n");
    }
    blocks.push({ type: "section", text: { type: "mrkdwn", text: connText } });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Care Assist Health Monitor · Run: \`${runId.slice(0, 8)}…\``,
      },
    ],
  });

  const fallbackText = `${emoji} Health Check: ${passed}/${total} passed, ${failed} failed, ${warned} warnings (${(durationMs / 1000).toFixed(1)}s)`;

  return { text: fallbackText, blocks };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth: secret header check ──
  const secret = req.headers.get("X-Health-Check-Secret") || req.headers.get("x-health-check-secret");
  const expectedSecret = Deno.env.get("HEALTH_CHECK_SECRET");

  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    let body: RequestBody = {};
    try {
      body = await req.json();
    } catch {
      // no body is fine — run all tests
    }

    const testsToRun = body.tests || ["functional", "integration", "performance", "database", "connectivity"];
    const concurrency = body.concurrency || 10;
    const runId = crypto.randomUUID();
    const startTime = performance.now();

    const allResults: CheckResult[] = [];

    // ── Execution order matters: Supabase rate-limits outbound function calls
    // per invocation. Suites that make subrequests to Supabase functions must be
    // sequenced so they don't compete for the same rate-limit budget:
    //   1. Database + Connectivity — no Supabase function subrequests; run in parallel
    //   2. Functional (fn-alive OPTIONS probes) — runs alone after a short gap
    //   3. Integration + Performance — run together after fn-alive completes

    // Phase 1: no-cost checks (DB queries + external API pings)
    const phase1: Promise<CheckResult[]>[] = [];
    if (testsToRun.includes("database")) phase1.push(runDatabaseTests());
    if (testsToRun.includes("connectivity")) phase1.push(runConnectivityTests());
    if (phase1.length) {
      const p1 = await Promise.all(phase1);
      for (const suite of p1) allResults.push(...suite);
    }

    // Phase 2: functional fn-alive OPTIONS probes (batched + delayed internally)
    if (testsToRun.includes("functional")) {
      const fnResults = await runFunctionalTests();
      allResults.push(...fnResults);
      // Brief cooldown before firing integration/perf requests
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Phase 3: integration + performance (POST subrequests to Supabase functions)
    const phase3: Promise<CheckResult[]>[] = [];
    if (testsToRun.includes("integration")) phase3.push(runIntegrationTests(body.propertyId));
    if (testsToRun.includes("performance")) phase3.push(runPerformanceTests(concurrency));
    if (phase3.length) {
      const p3 = await Promise.all(phase3);
      for (const suite of p3) allResults.push(...suite);
    }

    const durationMs = Math.round(performance.now() - startTime);

    // Store results in DB
    const supabase = createClient(SUPABASE_URL(), SERVICE_KEY());
    const rows = allResults.map((r) => ({
      run_id: runId,
      test_name: r.name,
      category: r.category,
      status: r.status,
      latency_ms: r.latencyMs,
      details: r.details || null,
    }));

    if (rows.length > 0) {
      const { error: insertErr } = await supabase
        .from("health_check_results")
        .insert(rows);
      if (insertErr) {
        console.error("Failed to store health check results:", insertErr);
      }
    }

    // Send Slack report (only if there are failures or warnings, or always on first run)
    const hasIssues = allResults.some((r) => r.status !== "pass");
    if (hasIssues || body.slackWebhookUrl) {
      await sendSlackReport(allResults, runId, durationMs, body.slackWebhookUrl);
    }

    // Build summary
    const summary = {
      total: allResults.length,
      pass: allResults.filter((r) => r.status === "pass").length,
      warn: allResults.filter((r) => r.status === "warn").length,
      fail: allResults.filter((r) => r.status === "fail").length,
    };

    return new Response(
      JSON.stringify({
        runId,
        timestamp: new Date().toISOString(),
        durationMs,
        summary,
        results: allResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

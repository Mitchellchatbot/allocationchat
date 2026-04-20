import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const htmlHeaders = { "Content-Type": "text/html; charset=utf-8" };
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function renderPage(type: "select" | "success" | "error", opts: {
  spaces?: { name: string; displayName: string }[];
  propertyId?: string;
  spaceName?: string;
  message?: string;
}): string {
  const isSuccess = type === "success";
  const isError = type === "error";

  if (type === "select") {
    const options = (opts.spaces || [])
      .map(s => `<option value="${s.name}">${s.displayName || s.name}</option>`)
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Select Google Chat Space</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
  .card { background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.1); max-width: 420px; width: 90%; overflow: hidden; animation: fadeIn .35s ease; }
  .header { background: linear-gradient(135deg,#F97316 0%,#ea580c 100%); padding: 28px 32px 24px; text-align: center; }
  .icon-ring { width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
  .header h1 { color: #fff; font-size: 18px; font-weight: 700; }
  .header p { color: rgba(255,255,255,.85); font-size: 13px; margin-top: 4px; }
  .body { padding: 24px 28px 28px; }
  label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
  select { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; color: #111827; background: #fff; cursor: pointer; }
  select:focus { outline: none; border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,.15); }
  .hint { font-size: 12px; color: #6b7280; margin-top: 6px; }
  .btn { display: block; width: 100%; margin-top: 20px; padding: 12px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; background: linear-gradient(135deg,#F97316 0%,#ea580c 100%); color: #fff; transition: opacity .2s; }
  .btn:hover { opacity: .88; }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="icon-ring">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </div>
    <h1>Select a Space</h1>
    <p>Care Assist &mdash; Google Chat</p>
  </div>
  <div class="body">
    <label for="space">Google Chat Space</label>
    <select id="space">
      ${options}
    </select>
    <p class="hint">Notifications will be posted to this space.</p>
    <button class="btn" id="connectBtn" onclick="connect()">Connect Space</button>
  </div>
</div>
<script>
  function connect() {
    var select = document.getElementById('space');
    var btn = document.getElementById('connectBtn');
    var spaceId = select.value;
    var spaceName = select.options[select.selectedIndex].text;
    btn.disabled = true;
    btn.textContent = 'Connecting\u2026';
    fetch(location.href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: '${opts.propertyId}', spaceId: spaceId, spaceName: spaceName }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.ok) {
        window.opener?.postMessage({ type: 'google-chat-oauth-success', spaceName: spaceName, sourcePropertyId: '${opts.propertyId}' }, '*');
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#16a34a;font-size:16px;font-weight:600;">Connected! Closing\u2026</div>';
        setTimeout(function() { window.close(); }, 1500);
      } else {
        btn.disabled = false;
        btn.textContent = 'Connect Space';
        alert(data.error || 'Failed to connect. Please try again.');
      }
    })
    .catch(function() {
      btn.disabled = false;
      btn.textContent = 'Connect Space';
      alert('Network error. Please try again.');
    });
  }
</script>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Google Chat ${isSuccess ? "Connected" : "Error"}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
  .card { background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.1); max-width: 420px; width: 90%; overflow: hidden; animation: fadeIn .35s ease; }
  .header { background: ${isSuccess ? "linear-gradient(135deg,#F97316 0%,#ea580c 100%)" : "linear-gradient(135deg,#ef4444 0%,#dc2626 100%)"}; padding: 32px 32px 28px; text-align: center; }
  .icon-ring { width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
  .header h1 { color: #fff; font-size: 20px; font-weight: 700; }
  .header p { color: rgba(255,255,255,.85); font-size: 13px; margin-top: 4px; }
  .body { padding: 28px 32px 32px; text-align: center; }
  .message { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
  .close-btn { display: inline-block; padding: 11px 28px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; background: ${isSuccess ? "linear-gradient(135deg,#F97316 0%,#ea580c 100%)" : "#64748b"}; color: #fff; transition: opacity .2s; }
  .close-btn:hover { opacity: .88; }
  .countdown { margin-top: 14px; font-size: 12px; color: #94a3b8; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="icon-ring">
      ${isSuccess
        ? `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
        : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
      }
    </div>
    <h1>${isSuccess ? "Connected Successfully" : "Connection Failed"}</h1>
    <p>Care Assist &mdash; Google Chat</p>
  </div>
  <div class="body">
    <p class="message">${opts.message || (isSuccess ? `Now posting to <strong>${opts.spaceName}</strong>.` : "Something went wrong.")}</p>
    <button class="close-btn" onclick="window.close()">Close Window</button>
    <p class="countdown">Closing in <span id="secs">5</span>s&hellip;</p>
  </div>
</div>
<script>
${isSuccess ? `window.opener?.postMessage({ type: 'google-chat-oauth-success', spaceName: '${opts.spaceName || ""}', sourcePropertyId: '${opts.propertyId || ""}' }, '*');` : ""}
var s = 5; var el = document.getElementById('secs');
var t = setInterval(function() { s--; if (el) el.textContent = s; if (s <= 0) { clearInterval(t); window.close(); } }, 1000);
</script>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-chat-oauth-callback`;

  // ── POST: space selection submitted from popup form ───────────────────────
  if (req.method === "POST") {
    try {
      const { propertyId, spaceId, spaceName } = await req.json();
      if (!propertyId || !spaceId) {
        return new Response(JSON.stringify({ ok: false, error: "Missing fields" }), {
          status: 400, headers: jsonHeaders,
        });
      }

      const { data: pending } = await supabase
        .from("google_chat_notification_settings")
        .select("pending_access_token, pending_refresh_token, pending_token_expires_at")
        .eq("property_id", propertyId)
        .maybeSingle();

      if (!pending?.pending_access_token) {
        return new Response(JSON.stringify({ ok: false, error: "Session expired. Please reconnect." }), {
          status: 400, headers: jsonHeaders,
        });
      }

      const { error: upsertErr } = await supabase
        .from("google_chat_notification_settings")
        .upsert({
          property_id: propertyId,
          enabled: true,
          access_token: pending.pending_access_token,
          refresh_token: pending.pending_refresh_token,
          token_expires_at: pending.pending_token_expires_at,
          space_id: spaceId,
          space_name: spaceName,
          pending_access_token: null,
          pending_refresh_token: null,
          pending_token_expires_at: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "property_id" });

      if (upsertErr) {
        console.error("[google-chat-oauth-callback POST] upsert error:", upsertErr);
        return new Response(JSON.stringify({ ok: false, error: "Failed to save settings" }), {
          status: 500, headers: jsonHeaders,
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: jsonHeaders,
      });
    } catch (err) {
      console.error("[google-chat-oauth-callback POST]", err);
      return new Response(JSON.stringify({ ok: false, error: "Server error" }), {
        status: 500, headers: jsonHeaders,
      });
    }
  }

  // ── GET: Google redirects here with ?code=&state= ─────────────────────────
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");

    if (oauthError) {
      return new Response(renderPage("error", { message: oauthError }), {
        headers: htmlHeaders,
      });
    }

    if (!code || !state) {
      return new Response(renderPage("error", { message: "Missing code or state." }), {
        headers: htmlHeaders,
      });
    }

    const colonIdx = state.indexOf(":");
    if (colonIdx === -1) {
      return new Response(renderPage("error", { message: "Invalid state parameter." }), {
        headers: htmlHeaders,
      });
    }

    const propertyId = state.substring(0, colonIdx);
    const csrfToken = state.substring(colonIdx + 1);

    // Validate CSRF
    const { data: existing } = await supabase
      .from("google_chat_notification_settings")
      .select("pending_access_token")
      .eq("property_id", propertyId)
      .maybeSingle();

    if (!existing || existing.pending_access_token !== csrfToken) {
      return new Response(renderPage("error", { message: "Security validation failed. Please try again." }), {
        headers: htmlHeaders,
      });
    }

    if (!clientId || !clientSecret) {
      return new Response(renderPage("error", { message: "Google Chat integration not configured." }), {
        headers: htmlHeaders,
      });
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
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

    if (!tokenData.access_token) {
      console.error("[google-chat-oauth-callback] token exchange failed:", tokenData);
      return new Response(renderPage("error", { message: `Token exchange failed: ${tokenData.error_description || tokenData.error}` }), {
        headers: htmlHeaders,
      });
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Store pending tokens in DB
    await supabase
      .from("google_chat_notification_settings")
      .update({
        pending_access_token: tokenData.access_token,
        pending_refresh_token: tokenData.refresh_token || null,
        pending_token_expires_at: expiresAt,
      })
      .eq("property_id", propertyId);

    // Fetch list of spaces user has access to
    const spacesRes = await fetch(
      "https://chat.googleapis.com/v1/spaces?filter=spaceType%3DSPACE&pageSize=100",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const spacesData = await spacesRes.json();
    const spaces: { name: string; displayName: string }[] = (spacesData.spaces || []).map((s: any) => ({
      name: s.name,
      displayName: s.displayName || s.name,
    }));

    // Also include DM spaces if no regular spaces found
    if (spaces.length === 0) {
      const dmRes = await fetch(
        "https://chat.googleapis.com/v1/spaces?pageSize=50",
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );
      const dmData = await dmRes.json();
      spaces.push(...(dmData.spaces || []).map((s: any) => ({
        name: s.name,
        displayName: s.displayName || s.name,
      })));
    }

    if (spaces.length === 0) {
      return new Response(renderPage("error", { message: "No Google Chat spaces found. Please create a space and try again." }), {
        headers: htmlHeaders,
      });
    }

    return new Response(renderPage("select", { spaces, propertyId }), {
      headers: htmlHeaders,
    });
  } catch (err) {
    console.error("[google-chat-oauth-callback GET]", err);
    return new Response(renderPage("error", { message: "An unexpected error occurred." }), {
      headers: htmlHeaders,
    });
  }
});

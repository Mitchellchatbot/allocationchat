import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('Slack OAuth callback received:', { code: !!code, state: !!state, error });

    if (error) {
      console.error('Slack OAuth error:', error);
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'slack-oauth-error', error: '${error}' }, '*'); window.close();</script><p>Error: ${error}. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: 'Missing code or state parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode state to get propertyId
    let propertyId: string;
    try {
      const stateData = JSON.parse(atob(state));
      propertyId = stateData.propertyId;
    } catch (e) {
      console.error('Failed to decode state:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid state parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get credentials from backend secrets (Zapier-style - single app for all users)
    const clientId = Deno.env.get('SLACK_CLIENT_ID');
    const clientSecret = Deno.env.get('SLACK_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Missing Slack credentials in backend secrets');
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'slack-oauth-error', error: 'Integration not configured' }, '*'); window.close();</script><p>Error: Slack integration not configured. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get the redirect URI (should match what was used in the authorization request)
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/slack-oauth-callback`;

    // Exchange code for access token using backend secrets
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Slack token response:', { ok: tokenData.ok, team: tokenData.team?.name });

    if (!tokenData.ok) {
      console.error('Slack token exchange failed:', tokenData.error);
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'slack-oauth-error', error: '${tokenData.error}' }, '*'); window.close();</script><p>Error: ${tokenData.error}. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    // Upsert the Slack settings with the access token and team info
    const { error: upsertError } = await supabase
      .from('slack_notification_settings')
      .upsert({
        property_id: propertyId,
        access_token: tokenData.access_token,
        team_id: tokenData.team?.id,
        team_name: tokenData.team?.name,
        bot_user_id: tokenData.bot_user_id,
        incoming_webhook_url: tokenData.incoming_webhook?.url,
        incoming_webhook_channel: tokenData.incoming_webhook?.channel,
        enabled: true,
      }, { onConflict: 'property_id' });

    if (upsertError) {
      console.error('Failed to save Slack settings:', upsertError);
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'slack-oauth-error', error: 'Failed to save' }, '*'); window.close();</script><p>Error: Failed to save. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    console.log('Slack OAuth completed successfully for property:', propertyId);

    // Return success HTML that closes the popup and notifies the parent
    return new Response(
      `<html><body><script>window.opener?.postMessage({ type: 'slack-oauth-success', team: '${tokenData.team?.name || 'Slack'}' }, '*'); window.close();</script><p>Connected successfully! You can close this window.</p></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('Slack OAuth callback error:', error);
    return new Response(
      `<html><body><script>window.opener?.postMessage({ type: 'slack-oauth-error', error: 'Server error' }, '*'); window.close();</script><p>Server error. You can close this window.</p></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );
  }
});

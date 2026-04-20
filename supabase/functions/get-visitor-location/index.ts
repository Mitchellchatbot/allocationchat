import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visitorId } = await req.json();

    if (!visitorId) {
      return new Response(
        JSON.stringify({ error: 'Missing visitorId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract IP from request headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0]?.trim() || realIp || null;

    // Skip geolocation for private/local IPs
    if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return new Response(
        JSON.stringify({ success: true, location: null, reason: 'private_ip' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call ip-api.com for geolocation (free tier, no API key needed)
    const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,countryCode`);
    
    if (!geoResponse.ok) {
      console.error('Geolocation API error:', geoResponse.status);
      return new Response(
        JSON.stringify({ success: true, location: null, reason: 'geo_api_error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geoData = await geoResponse.json();

    if (geoData.status !== 'success') {
      console.error('Geolocation lookup failed:', geoData);
      return new Response(
        JSON.stringify({ success: true, location: null, reason: 'geo_lookup_failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format location string: "City, State, Country"
    const locationParts = [geoData.city, geoData.regionName, geoData.countryCode].filter(Boolean);
    const location = locationParts.join(', ');

    // Update visitor record with location
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('visitors')
      .update({ location })
      .eq('id', visitorId);

    if (updateError) {
      console.error('Failed to update visitor location:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update visitor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, location }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-visitor-location:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

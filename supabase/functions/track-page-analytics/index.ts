import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_URL_LENGTH = 2048;
const MAX_TITLE_LENGTH = 500;
const MAX_PROPERTY_ID_LENGTH = 100;

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeText(text: string, maxLength: number): string {
  return text
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { property_id, url, page_title, event_type } = await req.json();

    // Validate required fields
    if (!property_id || !url || !event_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: property_id, url, event_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate property_id format (must be UUID)
    if (typeof property_id !== 'string' || !isValidUUID(property_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid property_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate event_type
    if (!['chat_open', 'human_escalation'].includes(event_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid event_type. Must be chat_open or human_escalation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format and length
    if (typeof url !== 'string' || url.length > MAX_URL_LENGTH || !isValidUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or excessively long URL. Must be a valid http/https URL.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize page_title
    const sanitizedTitle = page_title && typeof page_title === 'string'
      ? sanitizeText(page_title, MAX_TITLE_LENGTH)
      : null;

    // Create Supabase client with service role for insert
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify property exists before inserting
    const { data: propertyExists } = await supabase
      .from('properties')
      .select('id')
      .eq('id', property_id)
      .single();

    if (!propertyExists) {
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the analytics event
    const { data, error } = await supabase
      .from('page_analytics_events')
      .insert({
        property_id,
        url,
        page_title: sanitizedTitle,
        event_type,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting analytics event:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to track event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Tracked ${event_type} event for property: ${property_id}`);

    return new Response(
      JSON.stringify({ success: true, event_id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

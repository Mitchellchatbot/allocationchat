import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { propertyId } = await req.json();

    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: 'Property ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify property exists
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .maybeSingle();

    if (propError || !property) {
      return new Response(
        JSON.stringify({ agents: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI agent assignments for this property
    const { data: assignments, error: assignError } = await supabase
      .from('ai_agent_properties')
      .select('ai_agent_id')
      .eq('property_id', propertyId);

    if (assignError || !assignments || assignments.length === 0) {
      console.log('No AI agents assigned to property:', propertyId);
      return new Response(
        JSON.stringify({ agents: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const agentIds = assignments.map(a => a.ai_agent_id);

    // Fetch the actual AI agent data
    const { data: agents, error: agentError } = await supabase
      .from('ai_agents')
      .select('id, name, avatar_url, personality_prompt')
      .in('id', agentIds)
      .eq('status', 'active');

    if (agentError) {
      console.error('Error fetching AI agents:', agentError);
      return new Response(
        JSON.stringify({ agents: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${agents?.length || 0} AI agents for property ${propertyId}`);

    return new Response(
      JSON.stringify({ agents: agents || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get property AI agents error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visitorId, sessionId, updates } = await req.json();

    if (!visitorId || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Visitor ID and session ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the visitor exists and matches the session ID
    const { data: visitor, error: fetchError } = await supabase
      .from('visitors')
      .select('id, session_id')
      .eq('id', visitorId)
      .single();

    if (fetchError || !visitor) {
      return new Response(
        JSON.stringify({ error: 'Visitor not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Security check: ensure session ID matches
    if (visitor.session_id !== sessionId) {
      console.error('Session ID mismatch for visitor:', visitorId);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: session mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow updating specific safe fields from the widget
    const allowedFields = [
      'name', 'email', 'phone', 'current_page', 'browser_info',
      'age', 'date_of_birth', 'occupation', 'addiction_history', 'drug_of_choice',
      'treatment_interest', 'insurance_company', 'member_id', 'insurance_info',
      'urgency_level', 'location', 'insurance_card_url'
    ];

    const safeUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        safeUpdates[key] = value;
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid fields to update' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the visitor
    const { data: updatedVisitor, error: updateError } = await supabase
      .from('visitors')
      .update(safeUpdates)
      .eq('id', visitorId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating visitor:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update visitor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, visitor: updatedVisitor }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update visitor error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

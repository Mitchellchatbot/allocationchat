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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all properties with auto-purge enabled
    const { data: settings, error: settingsError } = await supabase
      .from('data_retention_settings')
      .select('id, property_id, retention_days')
      .eq('auto_purge_enabled', true);

    if (settingsError) {
      console.error('Failed to fetch retention settings:', settingsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalPurged = 0;

    for (const setting of settings || []) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - setting.retention_days);
      const cutoff = cutoffDate.toISOString();

      // Find old conversations
      const { data: oldConversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('property_id', setting.property_id)
        .lt('created_at', cutoff);

      if (oldConversations && oldConversations.length > 0) {
        const convIds = oldConversations.map(c => c.id);

        // Delete messages for old conversations
        await supabase
          .from('messages')
          .delete()
          .in('conversation_id', convIds);

        // Delete old conversations
        await supabase
          .from('conversations')
          .delete()
          .in('id', convIds);

        totalPurged += convIds.length;
      }

      // Delete old visitors without conversations
      const { data: oldVisitors } = await supabase
        .from('visitors')
        .select('id')
        .eq('property_id', setting.property_id)
        .lt('created_at', cutoff);

      if (oldVisitors && oldVisitors.length > 0) {
        const visitorIds = oldVisitors.map(v => v.id);
        
        // Only delete visitors that don't have any remaining conversations
        for (const visitorId of visitorIds) {
          const { count } = await supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('visitor_id', visitorId);
          
          if (count === 0) {
            await supabase.from('visitors').delete().eq('id', visitorId);
          }
        }
      }

      // Update last_purge_at
      await supabase
        .from('data_retention_settings')
        .update({ last_purge_at: new Date().toISOString() })
        .eq('id', setting.id);
    }

    console.log(`Purge complete. Total conversations purged: ${totalPurged}`);

    return new Response(
      JSON.stringify({ success: true, purged: totalPurged }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Purge error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

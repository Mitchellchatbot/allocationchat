import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface DbProperty {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  widget_color: string;
  greeting: string;
  offline_message: string;
  created_at: string;
  updated_at: string;
}

export interface DbVisitor {
  id: string;
  property_id: string;
  session_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  age: string | null;
  occupation: string | null;
  browser_info: string | null;
  location: string | null;
  current_page: string | null;
  created_at: string;
  addiction_history: string | null;
  drug_of_choice: string | null;
  treatment_interest: string | null;
  insurance_info: string | null;
  urgency_level: string | null;
  gclid: string | null;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'agent' | 'visitor';
  content: string;
  read: boolean;
  created_at: string;
  sequence_number: number;
}

export interface DbConversation {
  id: string;
  property_id: string;
  visitor_id: string;
  assigned_agent_id: string | null;
  status: 'active' | 'closed' | 'pending';
  is_test: boolean;
  ai_enabled: boolean;
  ai_queued_at: string | null;
  ai_queued_preview: string | null;
  ai_queued_paused: boolean;
  ai_queued_window_ms: number | null;
  created_at: string;
  updated_at: string;
  visitor?: DbVisitor;
  messages?: DbMessage[];
  property?: DbProperty;
}

export interface UseConversationsOptions {
  selectedPropertyId?: string;
  /** When set, filter properties to only those owned by this user (for agent workspace mode) */
  workspaceOwnerId?: string;
  /** When set, only show conversations unassigned or assigned to this agent ID */
  agentId?: string;
  /** When set, filter conversations to these specific property IDs (agent portal mode) */
  propertyIds?: string[];
  /** When true, skip the "must have at least one visitor message" filter */
  includeAllConversations?: boolean;
  /** When set, enables paginated loading with this many conversations per page */
  pageSize?: number;
}

// Query key factory
const QUERY_KEYS = {
  properties: (userId: string) => ['properties', userId] as const,
  conversations: (userId: string, propertyId?: string, agentId?: string, propertyIds?: string[]) =>
    ['conversations', userId, propertyId || 'all', agentId || 'none', propertyIds?.join(',') || ''] as const,
};

// Fire-and-forget: enqueue a Salesforce export for a triggered event.
// The queue processor (run-scheduled-extraction cron) handles the actual export,
// settings checks, and retry logic — keeping all that logic in one place.
export const triggerSalesforceAutoExport = async (
  conversationId: string,
  triggerField: 'auto_export_on_escalation' | 'auto_export_on_conversation_end'
) => {
  try {
    const { data: conv } = await supabase
      .from('conversations')
      .select('property_id, visitor_id')
      .eq('id', conversationId)
      .single();
    if (!conv) return;

    const triggerType = triggerField === 'auto_export_on_escalation' ? 'escalation' : 'conversation_end';
    const { error } = await supabase
      .from('salesforce_export_queue')
      .insert({
        property_id: conv.property_id,
        visitor_id: conv.visitor_id,
        conversation_id: conversationId,
        trigger_type: triggerType,
        status: 'pending',
        next_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    // 23505 = duplicate key: already queued and active, which is fine
    if (error && (error as any).code !== '23505') {
      console.error('Salesforce auto-export enqueue error:', error);
    }
  } catch (err) {
    console.error('Salesforce auto-export error:', err);
  }
};

export const useConversations = (options: UseConversationsOptions = {}) => {
  const { selectedPropertyId, workspaceOwnerId, agentId, propertyIds, includeAllConversations, pageSize } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Pagination state — only used when pageSize is set
  const pageOffsetRef = useRef(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const realtimeChannelSuffixRef = useRef<string>(
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  // Fetch properties with React Query
  const { 
    data: allProperties = [], 
    isLoading: propertiesLoading 
  } = useQuery({
    queryKey: QUERY_KEYS.properties(user?.id || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching properties:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
  });

  // Filter properties by workspace owner when in agent mode
  const properties = workspaceOwnerId 
    ? allProperties.filter(p => p.user_id === workspaceOwnerId)
    : allProperties;

  // Background stale cleanup — runs every 60s instead of blocking every fetch
  const staleCleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!user) return;
    const runCleanup = async () => {
      try {
        const { data: { user: validUser } } = await supabase.auth.getUser();
        if (validUser) {
          await supabase.functions.invoke('close-stale-conversations', {
            body: { propertyId: selectedPropertyId ?? null, staleSeconds: 45 },
          });
        }
      } catch {
        // Best-effort — silently ignore
      }
    };
    // Run once on mount, then every 60s
    runCleanup();
    staleCleanupRef.current = setInterval(runCleanup, 60000);
    return () => { if (staleCleanupRef.current) clearInterval(staleCleanupRef.current); };
  }, [user, selectedPropertyId]);

  // Fetch conversations with React Query
  const fetchConversationsData = useCallback(async (): Promise<DbConversation[]> => {
    if (!user) return [];

    // Reset pagination offset on each full refetch
    pageOffsetRef.current = 0;

    // Fetch total count when pagination is enabled
    if (pageSize) {
      let countQuery = supabase.from('conversations').select('*', { count: 'exact', head: true });
      if (propertyIds && propertyIds.length > 0) countQuery = countQuery.in('property_id', propertyIds);
      else if (selectedPropertyId && selectedPropertyId !== 'all') countQuery = countQuery.eq('property_id', selectedPropertyId);
      const { count } = await countQuery;
      setTotalCount(count ?? null);
    }

    // Step 1: fetch conversations WITHOUT messages embed (avoids slow LATERAL join + per-row RLS)
    let convQuery = supabase
      .from('conversations')
      .select(`*, visitor:visitors(*), property:properties(*)`)
      .order('updated_at', { ascending: false })
      .limit(pageSize ?? 300);

    if (propertyIds && propertyIds.length > 0) {
      convQuery = convQuery.in('property_id', propertyIds);
    } else if (selectedPropertyId && selectedPropertyId !== 'all') {
      convQuery = convQuery.eq('property_id', selectedPropertyId);
    }

    const { data: convData, error: convError } = await convQuery;

    if (convError) {
      console.error('Error fetching conversations:', convError);
      return [];
    }

    if (!convData || convData.length === 0) return [];

    // Step 2: fetch all messages for these conversations in ONE batch query
    // (one indexed IN lookup instead of 300 correlated subqueries)
    const convIds = convData.map((c) => c.id);
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', convIds)
      .order('sequence_number', { ascending: true });

    const messagesByConvId = new Map<string, DbMessage[]>();
    for (const m of (messagesData || []) as any[]) {
      const msg: DbMessage = { ...m, sender_type: m.sender_type as 'agent' | 'visitor' };
      const arr = messagesByConvId.get(m.conversation_id) || [];
      arr.push(msg);
      messagesByConvId.set(m.conversation_id, arr);
    }

    const conversationsWithMessages = convData.map((conv) => ({
      ...conv,
      status: conv.status as 'active' | 'closed' | 'pending',
      messages: messagesByConvId.get(conv.id) || [],
    }));

    if (pageSize) {
      setHasMoreConversations(convData.length === pageSize);
    }

    if (includeAllConversations) {
      return conversationsWithMessages as DbConversation[];
    }
    return conversationsWithMessages.filter(
      (conv) => conv.messages.some((m) => m.sender_type === 'visitor')
    ) as DbConversation[];
  }, [user, selectedPropertyId, agentId, propertyIds, includeAllConversations, pageSize]);

  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: QUERY_KEYS.conversations(user?.id || '', selectedPropertyId, agentId, propertyIds),
    queryFn: fetchConversationsData,
    // In agent mode, wait until we have assigned property IDs before fetching
    enabled: !!user && (propertyIds ? propertyIds.length > 0 : true),
    // Realtime handles most live updates; polling is a safety net for missed events
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
  });

  const loading = propertiesLoading || conversationsLoading;

  // Helper to update conversations cache — exposed so callers (e.g. AgentDashboard) can do surgical updates
  const updateConversationsCache = useCallback(
    (updater: (prev: DbConversation[]) => DbConversation[]) => {
      queryClient.setQueryData<DbConversation[]>(
        QUERY_KEYS.conversations(user?.id || '', selectedPropertyId, agentId, propertyIds),
        (old) => updater(old || [])
      );
    },
    [queryClient, user?.id, selectedPropertyId, agentId, propertyIds]
  );

  const loadMore = useCallback(async () => {
    if (!pageSize || isLoadingMore || !hasMoreConversations || !user) return;
    setIsLoadingMore(true);

    const newOffset = pageOffsetRef.current + pageSize;

    let convQuery = supabase
      .from('conversations')
      .select(`*, visitor:visitors(*), property:properties(*)`)
      .order('updated_at', { ascending: false })
      .range(newOffset, newOffset + pageSize - 1);

    if (propertyIds && propertyIds.length > 0) convQuery = convQuery.in('property_id', propertyIds);
    else if (selectedPropertyId && selectedPropertyId !== 'all') convQuery = convQuery.eq('property_id', selectedPropertyId);

    const { data: newConvs } = await convQuery;

    if (!newConvs || newConvs.length === 0) {
      setHasMoreConversations(false);
      setIsLoadingMore(false);
      return;
    }

    const { data: newMsgs } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', newConvs.map((c) => c.id))
      .order('sequence_number', { ascending: true });

    const msgsByConvId = new Map<string, DbMessage[]>();
    for (const m of (newMsgs || []) as any[]) {
      const arr = msgsByConvId.get(m.conversation_id) || [];
      arr.push({ ...m, sender_type: m.sender_type as 'agent' | 'visitor' });
      msgsByConvId.set(m.conversation_id, arr);
    }

    const newConvsWithMsgs = newConvs.map((c) => ({
      ...c,
      status: c.status as 'active' | 'closed' | 'pending',
      messages: msgsByConvId.get(c.id) || [],
    })) as DbConversation[];

    pageOffsetRef.current = newOffset;
    setHasMoreConversations(newConvs.length === pageSize);
    updateConversationsCache((prev) => [
      ...prev,
      ...newConvsWithMsgs.filter((nc) => !prev.some((p) => p.id === nc.id)),
    ]);
    setIsLoadingMore(false);
  }, [pageSize, isLoadingMore, hasMoreConversations, user, propertyIds, selectedPropertyId, updateConversationsCache]);

  // Fallback polling: periodically re-fetch to catch any messages missed by Realtime
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPollRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    if (!user) return;

    let pollInterval = 5000; // start at 5s
    let isActive = true;

    const poll = async () => {
      if (!isActive) return;
      try {
        const since = lastPollRef.current;
        let query = supabase
          .from('conversations')
          .select('id, updated_at')
          .gt('updated_at', since)
          .order('updated_at', { ascending: false })
          .limit(10);

        if (propertyIds && propertyIds.length > 0) {
          query = query.in('property_id', propertyIds);
        } else if (selectedPropertyId && selectedPropertyId !== 'all') {
          query = query.eq('property_id', selectedPropertyId);
        }

        const { data: updatedConvs } = await query;

        if (updatedConvs && updatedConvs.length > 0) {
          const convIds = updatedConvs.map(c => c.id);

          for (const convId of convIds) {
            const { data: freshConv } = await supabase
              .from('conversations')
              .select(`*, visitor:visitors(*), property:properties(*), messages(*)`)
              .eq('id', convId)
              .single();

            if (!freshConv) continue;

            const msgs = (freshConv.messages || []) as any[];
            if (!includeAllConversations && !msgs.some(m => m.sender_type === 'visitor')) continue;

            const sortedMessages = msgs
              .map(m => ({ ...m, sender_type: m.sender_type as 'agent' | 'visitor' }))
              .sort((a, b) => a.sequence_number - b.sequence_number);

            updateConversationsCache(prev => {
              const existing = prev.find(c => c.id === convId);
              if (!existing) {
                return [{
                  ...freshConv,
                  messages: sortedMessages,
                  status: freshConv.status as 'active' | 'closed' | 'pending',
                } as DbConversation, ...prev];
              }

              const existingMsgIds = new Set((existing.messages || []).map(m => m.id));
              const hasMissing = sortedMessages.some(m => !existingMsgIds.has(m.id));
              
              if (!hasMissing && existing.updated_at >= freshConv.updated_at) return prev;

              return prev.map(c => c.id === convId ? {
                ...c,
                ...freshConv,
                messages: sortedMessages,
                status: freshConv.status as 'active' | 'closed' | 'pending',
              } as DbConversation : c);
            });
          }

          lastPollRef.current = updatedConvs[0].updated_at;
          pollInterval = 5000;
        } else {
          pollInterval = Math.min(pollInterval * 1.5, 30000);
        }
      } catch {
        pollInterval = Math.min(pollInterval * 2, 30000);
      }

      if (isActive) {
        pollIntervalRef.current = setTimeout(poll, pollInterval);
      }
    };

    pollIntervalRef.current = setTimeout(poll, pollInterval);

    return () => {
      isActive = false;
      if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
    };
  }, [user, selectedPropertyId, propertyIds, includeAllConversations, updateConversationsCache]);

  const sendMessage = async (conversationId: string, content: string, senderId: string, assignAgentId?: string) => {
    const { data: maxSeqData } = await supabase
      .from('messages')
      .select('sequence_number')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSeq = (maxSeqData?.sequence_number || 0) + 1;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        sender_type: 'agent',
        content,
        read: true,
        sequence_number: nextSeq,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return null;
    }

    const updatePayload: Record<string, any> = { 
      status: 'active', 
      updated_at: new Date().toISOString(),
      ai_enabled: false,
    };
    if (assignAgentId) {
      updatePayload.assigned_agent_id = assignAgentId;
    }

    await supabase
      .from('conversations')
      .update(updatePayload)
      .eq('id', conversationId);

    // Only update conversation-level fields (ai_enabled, status). 
    // Do NOT optimistically add the message to avoid duplicates with the realtime INSERT event.
    updateConversationsCache(prev => 
      prev.map(c => c.id === conversationId 
        ? { ...c, ai_enabled: false, status: 'active' as const }
        : c
      )
    );
    // Fire-and-forget: auto-export on escalation (human took over)
    triggerSalesforceAutoExport(conversationId, 'auto_export_on_escalation');

    return data;
  };

  const markMessagesAsRead = async (conversationId: string) => {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'visitor');
  };

  const closeConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .update({ status: 'closed' })
      .eq('id', conversationId);

    if (error) {
      console.error('Error closing conversation:', error);
      toast.error('Failed to close conversation');
      return false;
    }

    updateConversationsCache(prev =>
      prev.map(c => c.id === conversationId ? { ...c, status: 'closed' as const } : c)
    );

    // Fire-and-forget: auto-export on conversation end
    triggerSalesforceAutoExport(conversationId, 'auto_export_on_conversation_end');

    return true;
  };

  const closeConversations = async (conversationIds: string[]) => {
    const { error } = await supabase
      .from('conversations')
      .update({ status: 'closed' })
      .in('id', conversationIds);

    if (error) {
      console.error('Error closing conversations:', error);
      toast.error('Failed to close conversations');
      return false;
    }

    toast.success(`${conversationIds.length} conversation${conversationIds.length > 1 ? 's' : ''} closed`);
    
    updateConversationsCache(prev =>
      prev.map(c => conversationIds.includes(c.id) ? { ...c, status: 'closed' as const } : c)
    );

    // Fire-and-forget: auto-export on conversation end for each closed conversation
    conversationIds.forEach(id => triggerSalesforceAutoExport(id, 'auto_export_on_conversation_end'));
    
    return true;
  };

  const deleteConversation = async (conversationId: string) => {
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (messagesError) {
      console.error('Error deleting messages:', messagesError);
      toast.error('Failed to delete conversation');
      return false;
    }

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
      return false;
    }

    toast.success('Conversation deleted');
    updateConversationsCache(prev => prev.filter(c => c.id !== conversationId));
    
    return true;
  };

  const deleteConversations = async (conversationIds: string[]) => {
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .in('conversation_id', conversationIds);

    if (messagesError) {
      console.error('Error deleting messages:', messagesError);
      toast.error('Failed to delete conversations');
      return false;
    }

    const { error } = await supabase
      .from('conversations')
      .delete()
      .in('id', conversationIds);

    if (error) {
      console.error('Error deleting conversations:', error);
      toast.error('Failed to delete conversations');
      return false;
    }

    toast.success(`${conversationIds.length} conversation${conversationIds.length > 1 ? 's' : ''} deleted`);
    updateConversationsCache(prev => prev.filter(c => !conversationIds.includes(c.id)));
    
    return true;
  };

  const createProperty = async (
    name: string,
    domain: string,
    options?: {
      greeting?: string;
      collectEmail?: boolean;
      collectName?: boolean;
      collectPhone?: boolean;
      basePrompt?: string;
      agentName?: string;
      agentAvatarUrl?: string;
      widgetIcon?: string;
      businessPhone?: string;
      businessEmail?: string;
      businessAddress?: string;
      businessHours?: string;
      businessDescription?: string;
      businessLogoUrl?: string;
    }
  ) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('properties')
      .insert({
        user_id: user.id,
        name,
        domain,
        greeting: options?.greeting,
        require_email_before_chat: options?.collectEmail,
        require_name_before_chat: options?.collectName,
        require_phone_before_chat: options?.collectPhone,
        ai_base_prompt: options?.basePrompt,
        widget_icon: options?.widgetIcon || 'message-circle',
        business_phone: options?.businessPhone || null,
        business_email: options?.businessEmail || null,
        business_address: options?.businessAddress || null,
        business_hours: options?.businessHours || null,
        business_description: options?.businessDescription || null,
        business_logo_url: options?.businessLogoUrl || null,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating property:', error);
      toast.error('Failed to create property');
      return null;
    }

    const agentNameToUse = options?.agentName?.trim() || 'Support Assistant';
    const { data: aiAgent, error: agentError } = await supabase
      .from('ai_agents')
      .insert({
        owner_id: user.id,
        name: agentNameToUse,
        avatar_url: options?.agentAvatarUrl || null,
        personality_prompt: options?.basePrompt || null,
        status: 'active',
      })
      .select()
      .single();

    if (agentError) {
      console.error('Error creating AI agent:', agentError);
    } else if (aiAgent) {
      const { error: linkError } = await supabase
        .from('ai_agent_properties')
        .insert({
          ai_agent_id: aiAgent.id,
          property_id: data.id,
        });

      if (linkError) {
        console.error('Error linking AI agent to property:', linkError);
      }
    }

    toast.success('Property created successfully');
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.properties(user.id) });
    return data;
  };

  const deleteProperty = async (propertyId: string) => {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId);

    if (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
      return false;
    }

    toast.success('Property deleted successfully');
    if (user) {
      const key = QUERY_KEYS.properties(user.id);
      queryClient.setQueryData(key, (old: any[]) => (old || []).filter((p: any) => p.id !== propertyId));
      queryClient.invalidateQueries({ queryKey: key });
    }
    return true;
  };

  const toggleAI = async (conversationId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('conversations')
      .update({ ai_enabled: enabled })
      .eq('id', conversationId);

    if (error) {
      console.error('Error toggling AI:', error);
      toast.error('Failed to update AI setting');
      return false;
    }

    updateConversationsCache(prev => 
      prev.map(c => c.id === conversationId ? { ...c, ai_enabled: enabled } : c)
    );

    // If AI was just disabled (escalation to human), trigger auto-export
    if (!enabled) {
      triggerSalesforceAutoExport(conversationId, 'auto_export_on_escalation');
    }

    return true;
  };

  // Optimized realtime subscriptions with cache mutations
  useEffect(() => {
    if (!user) return;

    

    // Optimization #6: Single-query conversation fetch with embedded messages
    const fetchSingleConversation = async (conversationId: string) => {
      const { data } = await supabase
        .from('conversations')
        .select(`*, visitor:visitors(*), property:properties(*), messages(*)`)
        .eq('id', conversationId)
        .single();
      
      if (!data) return;

      const msgs = (data.messages || []) as any[];
      if (!includeAllConversations && !msgs.some(m => m.sender_type === 'visitor')) return;
      
      const sortedMessages = msgs
        .map(m => ({ ...m, sender_type: m.sender_type as 'agent' | 'visitor' }))
        .sort((a, b) => a.sequence_number - b.sequence_number);
      
      const newConversation: DbConversation = {
        ...data,
        messages: sortedMessages,
        status: data.status as 'active' | 'closed' | 'pending',
      };
      
      updateConversationsCache(prev => {
        if (prev.some(c => c.id === data.id)) return prev;
        return [newConversation, ...prev];
      });
    };

    // Single consolidated Realtime channel for messages, conversations, visitors, and properties
    const realtimeChannel = supabase
      .channel(`dashboard-realtime-${realtimeChannelSuffixRef.current}`)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'properties' },
        (payload) => {
          const deletedId = (payload.old as any)?.id;
          if (!deletedId || !user) return;
          const key = QUERY_KEYS.properties(user.id);
          queryClient.setQueryData(key, (old: any[]) => (old || []).filter((p: any) => p.id !== deletedId));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as DbMessage;
          
          updateConversationsCache(prev => {
            const conversationExists = prev.some(c => c.id === newMessage.conversation_id);
            if (!conversationExists) {
              fetchSingleConversation(newMessage.conversation_id);
              return prev;
            }
            
            return prev.map(c => {
              if (c.id !== newMessage.conversation_id) return c;
              const existing = c.messages || [];
              const alreadyExists = existing.some(m => m.id === newMessage.id);
              if (alreadyExists) return { ...c, updated_at: newMessage.created_at };
              const merged = [...existing, {
                ...newMessage,
                sender_type: newMessage.sender_type as 'agent' | 'visitor',
              }].sort((a, b) => a.sequence_number - b.sequence_number);
              return { ...c, messages: merged, updated_at: newMessage.created_at };
            });
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMessage = payload.new as DbMessage;
          
          updateConversationsCache(prev =>
            prev.map(c => 
              c.id === updatedMessage.conversation_id
                ? {
                    ...c,
                    messages: (c.messages || []).map(m =>
                      m.id === updatedMessage.id
                        ? { ...updatedMessage, sender_type: updatedMessage.sender_type as 'agent' | 'visitor' }
                        : m
                    ),
                  }
                : c
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        async (payload) => {
          const newConv = payload.new;
          // Filter by propertyIds (agent mode) or selectedPropertyId (client mode)
          if (propertyIds && propertyIds.length > 0) {
            if (!propertyIds.includes(newConv.property_id)) return;
          } else if (selectedPropertyId && selectedPropertyId !== 'all' && newConv.property_id !== selectedPropertyId) {
            return;
          }
          fetchSingleConversation(newConv.id);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          const updated = payload.new;
          
          updateConversationsCache(prev =>
            prev.map(c => 
              c.id === updated.id
                ? { 
                    ...c, 
                    status: updated.status as 'active' | 'closed' | 'pending',
                    ai_enabled: updated.ai_enabled,
                    assigned_agent_id: updated.assigned_agent_id,
                    updated_at: updated.updated_at,
                    ai_queued_at: updated.ai_queued_at ?? null,
                    ai_queued_preview: updated.ai_queued_preview ?? null,
                    ai_queued_paused: updated.ai_queued_paused ?? false,
                    ai_queued_window_ms: updated.ai_queued_window_ms ?? null,
                  }
                : c
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'conversations' },
        (payload) => {
          const deleted = payload.old;
          updateConversationsCache(prev => prev.filter(c => c.id !== deleted.id));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'visitors' },
        (payload) => {
          const updatedVisitor = payload.new as DbVisitor;
          
          updateConversationsCache(prev =>
            prev.map(c => 
              c.visitor?.id === updatedVisitor.id
                ? { ...c, visitor: updatedVisitor }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [user, selectedPropertyId, propertyIds, includeAllConversations, updateConversationsCache]);

  const pauseAIQueue = async (conversationId: string, paused: boolean) => {
    await supabase
      .from('conversations')
      .update({ ai_queued_paused: paused })
      .eq('id', conversationId);

    updateConversationsCache(prev =>
      prev.map(c => c.id === conversationId ? { ...c, ai_queued_paused: paused } : c)
    );
  };

  const cancelAIQueue = async (conversationId: string) => {
    await supabase
      .from('conversations')
      .update({ ai_queued_at: null, ai_queued_preview: null, ai_queued_paused: false })
      .eq('id', conversationId);

    updateConversationsCache(prev =>
      prev.map(c => c.id === conversationId ? { ...c, ai_queued_at: null, ai_queued_preview: null, ai_queued_paused: false } : c)
    );
  };

  const editAIQueuedMessage = async (conversationId: string, newContent: string, messageId: string) => {
    // '__pending_ai__' is the synthetic pending bubble — there is no real messages row yet,
    // so only update the preview column on the conversation.
    if (messageId !== '__pending_ai__') {
      await supabase
        .from('messages')
        .update({ content: newContent })
        .eq('id', messageId);
    }

    // Always update the preview in the conversation
    await supabase
      .from('conversations')
      .update({ ai_queued_preview: newContent })
      .eq('id', conversationId);

    // Update local cache
    updateConversationsCache(prev =>
      prev.map(c => {
        if (c.id !== conversationId) return c;
        const updated: typeof c = { ...c, ai_queued_preview: newContent };
        if (messageId !== '__pending_ai__') {
          updated.messages = (c.messages || []).map(m =>
            m.id === messageId ? { ...m, content: newContent } : m
          );
        }
        return updated;
      })
    );
  };

  /** Immediately deliver the queued AI message by clearing the queue timer (widget sees null ai_queued_at and delivers) */
  const sendNowAIQueue = async (conversationId: string) => {
    // Set ai_queued_at to a past timestamp so the widget's deadline expires instantly
    // and also clear paused state
    await supabase
      .from('conversations')
      .update({ ai_queued_paused: false, ai_queued_window_ms: 0 })
      .eq('id', conversationId);

    updateConversationsCache(prev =>
      prev.map(c => c.id === conversationId ? { ...c, ai_queued_paused: false, ai_queued_window_ms: 0 } : c)
    );
  };

  return {
    conversations,
    properties,
    loading,
    sendMessage,
    markMessagesAsRead,
    closeConversation,
    closeConversations,
    deleteConversation,
    deleteConversations,
    createProperty,
    deleteProperty,
    toggleAI,
    pauseAIQueue,
    cancelAIQueue,
    editAIQueuedMessage,
    sendNowAIQueue,
    updateConversationsCache,
    refetch: refetchConversations,
    loadMore,
    hasMoreConversations,
    isLoadingMore,
    totalCount,
  };
};

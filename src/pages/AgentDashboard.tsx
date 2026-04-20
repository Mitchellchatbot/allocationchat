import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useConversations, triggerSalesforceAutoExport } from '@/hooks/useConversations';
import { requestNotificationPermission } from '@/hooks/useInAppNotifications';
import type { DbConversation } from '@/hooks/useConversations';
import { ChatPanel } from '@/components/dashboard/ChatPanel';
import { ConversationList } from '@/components/dashboard/ConversationList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { UserAvatarUpload } from '@/components/sidebar/UserAvatarUpload';
import { Input } from '@/components/ui/input';
import { LogOut, MessageSquare, RefreshCw, Inbox, Archive, ArrowLeft, Pencil, Check, X, Settings, Search, Loader2 } from 'lucide-react';
import { AgentComplaintDialog } from '@/components/agent/AgentComplaintDialog';
import { toast } from 'sonner';
import type { Conversation, Message, Visitor } from '@/types/chat';

function getSnippet(content: string, query: string): string {
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, 80) + (content.length > 80 ? '…' : '');
  const start = Math.max(0, idx - 20);
  const end = Math.min(content.length, idx + query.length + 50);
  return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
}

export default function AgentDashboard() {
  const { user, isAgent, loading, signOut, role, isAdmin, isClient, hasAgentAccess } = useAuth();
  const { profile, updateAvatarUrl } = useUserProfile();
  const navigate = useNavigate();
  const { conversationId: urlConversationId } = useParams();
  
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(() => {
    try {
      const cached = sessionStorage.getItem('agent-selected-conversation');
      if (cached && urlConversationId) {
        const parsed = JSON.parse(cached);
        if (parsed?.id === urlConversationId) {
          // Restore dates from JSON
          return {
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            updatedAt: new Date(parsed.updatedAt),
            visitor: { ...parsed.visitor, createdAt: new Date(parsed.visitor.createdAt) },
            messages: parsed.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
            lastMessage: parsed.lastMessage ? { ...parsed.lastMessage, timestamp: new Date(parsed.lastMessage.timestamp) } : undefined,
          };
        }
      }
    } catch {}
    return null;
  });
  const [agentStatus, setAgentStatus] = useState<'online' | 'offline' | 'away'>('online');
  const [agentProfile, setAgentProfile] = useState<{ id: string; name: string; email: string; avatar_url?: string } | null>(null);
  const [assignedPropertyIds, setAssignedPropertyIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('active');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    conversation: Conversation;
    matchedMessageId?: string;
    preview?: string;
  }> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | undefined>(undefined);
  const searchVersionRef = useRef(0);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Redirect if no agent access at all
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && !isAgent && !hasAgentAccess) {
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, isAgent, hasAgentAccess, loading, navigate, role]);

  // Request browser notification permission and reset page title on mount
  useEffect(() => {
    requestNotificationPermission();
    document.title = 'Care Assist';
    return () => { document.title = 'Care Assist'; };
  }, []);

  // Fetch agent profile and assigned properties
  useEffect(() => {
    const fetchAgentProfile = async () => {
      if (!user) return;
      
      const { data: agentData } = await supabase
        .from('agents')
        .select('id, name, email, status, avatar_url')
        .eq('user_id', user.id)
        .single();
      
      if (agentData) {
        setAgentProfile({ 
          id: agentData.id, 
          name: agentData.name, 
          email: agentData.email,
          avatar_url: agentData.avatar_url 
        });
        setAgentStatus(agentData.status as 'online' | 'offline' | 'away');

        // Fetch assigned properties
        const { data: assignments } = await supabase
          .from('property_agents')
          .select('property_id')
          .eq('agent_id', agentData.id);

        if (assignments) {
          setAssignedPropertyIds(assignments.map(a => a.property_id));
        }
      }
    };

    if (isAgent || hasAgentAccess) {
      fetchAgentProfile();
    }
  }, [user, isAgent, hasAgentAccess]);

  // React Query-backed conversations — single embedded query, realtime + polling handled by hook
  const {
    conversations: rawConversations,
    loading: conversationsLoading,
    sendMessage: hookSendMessage,
    markMessagesAsRead,
    closeConversation: hookCloseConversation,
    toggleAI: hookToggleAI,
    pauseAIQueue: hookPauseAIQueue,
    cancelAIQueue: hookCancelAIQueue,
    editAIQueuedMessage: hookEditAIQueuedMessage,
    sendNowAIQueue: hookSendNowAIQueue,
    refetch: refetchConversations,
    loadMore: loadMoreConversations,
    hasMoreConversations,
    isLoadingMore,
    totalCount: totalConversationCount,
  } = useConversations({
    propertyIds: assignedPropertyIds,
    includeAllConversations: true,
    pageSize: 50,
  });

  // Map DbConversation (snake_case) → Conversation (camelCase) used by UI components.
  // Messages are embedded in the initial fetch — no lazy loading needed.
  const conversations: Conversation[] = useMemo(() => {
    return rawConversations.map((c: DbConversation) => {
      const messages: Message[] = (c.messages || []).map(m => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        senderType: m.sender_type,
        content: m.content,
        read: m.read,
        timestamp: new Date(m.created_at),
      }));
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
      const visitor: Visitor = {
        id: c.visitor!.id,
        name: c.visitor!.name || undefined,
        email: c.visitor!.email || undefined,
        sessionId: c.visitor!.session_id,
        propertyId: c.visitor!.property_id,
        currentPage: c.visitor!.current_page || undefined,
        browserInfo: c.visitor!.browser_info || undefined,
        location: c.visitor!.location || undefined,
        createdAt: new Date(c.visitor!.created_at),
      };
      return {
        id: c.id,
        visitorId: c.visitor_id,
        propertyId: c.property_id,
        propertyName: c.property?.name || c.property?.domain || undefined,
        status: c.status,
        assignedAgentId: c.assigned_agent_id,
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at),
        visitor,
        messages,
        lastMessage,
        unreadCount: messages.filter(m => !m.read && m.senderType === 'visitor').length,
        ai_enabled: c.ai_enabled ?? true,
        aiQueuedAt: c.ai_queued_at ? new Date(c.ai_queued_at) : null,
        aiQueuedPreview: c.ai_queued_preview ?? null,
        aiQueuedPaused: c.ai_queued_paused ?? false,
        aiQueuedWindowMs: c.ai_queued_window_ms ?? null,
        missedReply: false,
      } as Conversation & { ai_enabled?: boolean; aiQueuedAt?: Date | null; aiQueuedPreview?: string | null; aiQueuedPaused?: boolean; aiQueuedWindowMs?: number | null };
    });
  }, [rawConversations]);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim() || assignedPropertyIds.length === 0) {
      setSearchResults(null);
      return;
    }
    const version = ++searchVersionRef.current;
    setIsSearching(true);
    try {
      // 1. Find visitors by name/email
      const { data: visitorRows } = await supabase
        .from('visitors')
        .select('id')
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(50);
      const visitorIds = (visitorRows || []).map((v: any) => v.id);

      // 2. Find conversations matching visitor name, within assigned properties
      const nameMatchIds = new Set<string>();
      if (visitorIds.length > 0) {
        const { data: convsByName } = await supabase
          .from('conversations')
          .select('id')
          .in('visitor_id', visitorIds)
          .in('property_id', assignedPropertyIds);
        (convsByName || []).forEach((c: any) => nameMatchIds.add(c.id));
      }

      // 3. Find messages matching content
      const { data: msgRows } = await supabase
        .from('messages')
        .select('id, conversation_id, content')
        .ilike('content', `%${q}%`)
        .order('created_at', { ascending: true })
        .limit(100);

      // First matching message per conversation
      const msgMatchMap = new Map<string, { id: string; content: string }>();
      for (const msg of (msgRows || []) as any[]) {
        if (!msgMatchMap.has(msg.conversation_id)) {
          msgMatchMap.set(msg.conversation_id, { id: msg.id, content: msg.content });
        }
      }

      const allConvIds = new Set([...nameMatchIds, ...msgMatchMap.keys()]);
      if (allConvIds.size === 0) {
        if (version === searchVersionRef.current) setSearchResults([]);
        return;
      }

      // 4. Fetch full conversations filtered to assigned properties
      const { data: convData } = await supabase
        .from('conversations')
        .select(`*, visitors!inner(*), property:properties(name, domain)`)
        .in('id', Array.from(allConvIds))
        .in('property_id', assignedPropertyIds)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (!convData || version !== searchVersionRef.current) return;

      // 5. Fetch all messages for matched conversations in one batch query (avoids N+1)
      const matchedConvIds = (convData as any[]).map(c => c.id);
      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', matchedConvIds)
        .order('created_at', { ascending: true });

      if (version !== searchVersionRef.current) return;

      const messagesByConvId = new Map<string, Message[]>();
      for (const m of allMessages as any[]) {
        const msg: Message = {
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          senderType: m.sender_type as 'agent' | 'visitor',
          content: m.content,
          read: m.read,
          timestamp: new Date(m.created_at),
        };
        const arr = messagesByConvId.get(m.conversation_id) || [];
        arr.push(msg);
        messagesByConvId.set(m.conversation_id, arr);
      }

      const results: Array<{ conversation: Conversation; matchedMessageId?: string; preview?: string }> = [];
      for (const c of convData as any[]) {
        const messages = messagesByConvId.get(c.id) || [];

        const visitor: Visitor = {
          id: c.visitors.id,
          name: c.visitors.name || undefined,
          email: c.visitors.email || undefined,
          sessionId: c.visitors.session_id,
          propertyId: c.visitors.property_id,
          currentPage: c.visitors.current_page || undefined,
          browserInfo: c.visitors.browser_info || undefined,
          location: c.visitors.location || undefined,
          createdAt: new Date(c.visitors.created_at),
        };

        const unreadCount = messages.filter(m => !m.read && m.senderType === 'visitor').length;
        const conversation: Conversation = {
          id: c.id,
          visitorId: c.visitor_id,
          propertyId: c.property_id,
          propertyName: c.property?.name || c.property?.domain || undefined,
          status: c.status as 'pending' | 'active' | 'closed',
          assignedAgentId: c.assigned_agent_id,
          createdAt: new Date(c.created_at),
          updatedAt: new Date(c.updated_at),
          visitor,
          messages,
          lastMessage: messages.length > 0 ? messages[messages.length - 1] : undefined,
          unreadCount,
          ai_enabled: c.ai_enabled ?? true,
          aiQueuedAt: c.ai_queued_at ? new Date(c.ai_queued_at) : null,
          aiQueuedPreview: c.ai_queued_preview ?? null,
          aiQueuedPaused: c.ai_queued_paused ?? false,
          aiQueuedWindowMs: c.ai_queued_window_ms ?? null,
        } as any;

        const msgMatch = msgMatchMap.get(c.id);
        results.push({
          conversation,
          matchedMessageId: msgMatch?.id,
          preview: msgMatch ? getSnippet(msgMatch.content, q) : undefined,
        });
      }

      if (version === searchVersionRef.current) setSearchResults(results);
    } finally {
      if (version === searchVersionRef.current) setIsSearching(false);
    }
  }, [assignedPropertyIds]);

  // Infinite scroll — load more when user scrolls near the bottom of the list
  const handleListScroll = useCallback(() => {
    const el = listContainerRef.current;
    if (!el || !hasMoreConversations || isLoadingMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 150) {
      loadMoreConversations();
    }
  }, [hasMoreConversations, isLoadingMore, loadMoreConversations]);

  // Debounced search trigger
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(() => performSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Filter conversations by status tab
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      if (statusFilter === 'active' && conv.status === 'closed') return false;
      if (statusFilter === 'closed' && conv.status !== 'closed') return false;
      return true;
    });
  }, [conversations, statusFilter]);

  // Badge counts
  const activeCount = useMemo(() => conversations.filter(c => c.status !== 'closed').length, [conversations]);
  const closedCount = useMemo(() => conversations.filter(c => c.status === 'closed').length, [conversations]);

  // Search-derived values
  const displayConversations = searchResults !== null
    ? searchResults.map(r => r.conversation)
    : filteredConversations;

  const matchedPreviews = useMemo(() => {
    if (!searchResults) return undefined;
    const map = new Map<string, { messageId: string; preview: string }>();
    for (const r of searchResults) {
      if (r.matchedMessageId && r.preview) {
        map.set(r.conversation.id, { messageId: r.matchedMessageId, preview: r.preview });
      }
    }
    return map;
  }, [searchResults]);

  // Sync selected conversation from URL. Messages are always embedded in the hook's data,
  // so we can use the conv from the list directly — no lazy-load preservation needed.
  useEffect(() => {
    if (!urlConversationId || conversations.length === 0) return;
    const conv = conversations.find(c => c.id === urlConversationId);
    if (!conv) return;
    setSelectedConversation(prev => {
      // Only update if the conversation actually changed (avoid spurious re-renders)
      if (prev?.id === conv.id && prev?.updatedAt?.getTime() === conv.updatedAt?.getTime()) return prev;
      try { sessionStorage.setItem('agent-selected-conversation', JSON.stringify(conv)); } catch {}
      return conv;
    });
  }, [urlConversationId, conversations]);

  // Cache selected conversation on manual selection
  useEffect(() => {
    if (selectedConversation) {
      try { sessionStorage.setItem('agent-selected-conversation', JSON.stringify(selectedConversation)); } catch {}
    } else {
      sessionStorage.removeItem('agent-selected-conversation');
    }
  }, [selectedConversation]);


  // Update agent status
  const updateAgentStatus = async (status: 'online' | 'offline' | 'away') => {
    if (!user || !agentProfile) return;

    const { error } = await supabase
      .from('agents')
      .update({ status })
      .eq('user_id', user.id);

    if (!error) {
      setAgentStatus(status);
      
      // Log status change notification (only for online/offline, not away)
      if (status === 'online' || status === 'offline') {
        const propId = assignedPropertyIds[0];
        if (propId) {
          supabase.from('notification_logs').insert({
            property_id: propId,
            notification_type: status === 'online' ? 'agent_online' : 'agent_offline',
            channel: 'in_app',
            recipient: 'system',
            recipient_type: 'system',
            status: 'sent',
            visitor_name: agentProfile.name,
          }).then(() => {});
        }
      }
    }
  };

  const handleSignOut = async () => {
    await updateAgentStatus('offline');
    await signOut();
    navigate('/auth');
  };

  const handleSaveName = async () => {
    if (!editName.trim() || !user || !agentProfile) return;
    const { error } = await supabase
      .from('agents')
      .update({ name: editName.trim() })
      .eq('user_id', user.id);
    if (error) {
      toast.error('Failed to update name');
      return;
    }
    setAgentProfile({ ...agentProfile, name: editName.trim() });
    setIsEditingName(false);
    toast.success('Name updated');
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || !agentProfile) return;
    // hookSendMessage handles: sequence number, insert, ai_enabled=false, status=active,
    // assigned_agent_id, updated_at bump, and Salesforce auto-export.
    await hookSendMessage(selectedConversation.id, content, agentProfile.id, agentProfile.id);
  };

  const handleCloseConversation = async () => {
    if (!selectedConversation) return;
    // hookCloseConversation handles: DB update, cache update, and Salesforce auto-export
    await hookCloseConversation(selectedConversation.id);
    setSelectedConversation(prev => prev?.id === selectedConversation.id ? { ...prev, status: 'closed' } : prev);
  };

  // AI toggle for conversations - use persisted value from database
  const selectedDbConv = selectedConversation 
    ? (conversations.find(c => c.id === selectedConversation.id) as any) 
    : null;
  const isAIEnabled = selectedDbConv?.ai_enabled ?? true;
  const aiQueuedAt = selectedDbConv?.aiQueuedAt ?? null;
  const aiQueuedPreview = selectedDbConv?.aiQueuedPreview ?? null;
  const aiQueuedWindowMs = selectedDbConv?.aiQueuedWindowMs ?? null;
  const aiQueuedPaused = selectedDbConv?.aiQueuedPaused ?? false;

  const handlePauseAIQueue = async (paused: boolean) => {
    if (!selectedConversation?.id) return;
    await hookPauseAIQueue(selectedConversation.id, paused);
  };

  const handleCancelAIQueue = async () => {
    if (!selectedConversation?.id) return;
    await hookCancelAIQueue(selectedConversation.id);
  };

  const handleEditAIQueue = async (messageId: string, newContent: string) => {
    if (!selectedConversation?.id) return;
    await hookEditAIQueuedMessage(selectedConversation.id, newContent, messageId);
  };

  const handleSendNow = async () => {
    if (!selectedConversation?.id) return;
    await hookSendNowAIQueue(selectedConversation.id);
  };

  const handleToggleAI = async () => {
    if (!selectedConversation?.id) return;
    await hookToggleAI(selectedConversation.id, !isAIEnabled);
  };

  // Show admin/client portal access
  const canSwitchToAdmin = isAdmin || isClient;

  if (loading || (!isAgent && !hasAgentAccess)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
        {!loading && (
          <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate('/auth'); }}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Conversation List */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Agent Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserAvatarUpload
                userId={user?.id || ''}
                avatarUrl={profile?.avatar_url || agentProfile?.avatar_url}
                initials={agentProfile?.name?.charAt(0).toUpperCase() || 'A'}
                onAvatarUpdate={updateAvatarUrl}
                size="md"
              />
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 text-sm px-1 py-0"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleSaveName}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setIsEditingName(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 group">
                    <p className="font-medium text-sm">{agentProfile?.name || 'Agent'}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => { setEditName(agentProfile?.name || ''); setIsEditingName(true); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{agentProfile?.email}</p>
              </div>
            </div>
          </div>
          
          {/* Status Selector */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={agentStatus === 'online' ? 'default' : 'outline'}
              onClick={() => updateAgentStatus('online')}
              className="flex-1"
            >
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
              Online
            </Button>
            <Button
              size="sm"
              variant={agentStatus === 'away' ? 'default' : 'outline'}
              onClick={() => updateAgentStatus('away')}
              className="flex-1"
            >
              <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
              Away
            </Button>
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Conversations</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => refetchConversations()} className="h-7 w-7">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Badge variant="secondary">
                {totalConversationCount !== null
                  ? `${conversations.length} / ${totalConversationCount}`
                  : displayConversations.length}
              </Badge>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              {isSearching ? (
                <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
              ) : (
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              )}
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search names or messages…"
                className="pl-8 pr-7 h-8 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults(null); setScrollToMessageId(undefined); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Status Tabs — hidden while searching */}
          {!searchQuery && (
            <div className="px-3 py-2 border-b border-border">
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'closed')}>
                <TabsList className="w-full grid grid-cols-3 h-8">
                  <TabsTrigger value="all" className="text-xs h-7">
                    All
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{conversations.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="active" className="text-xs h-7">
                    <Inbox className="h-3 w-3 mr-1" />
                    Active
                    {activeCount > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{activeCount}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="closed" className="text-xs h-7">
                    <Archive className="h-3 w-3 mr-1" />
                    Closed
                    {closedCount > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{closedCount}</Badge>}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Search no-results label */}
          {searchQuery && !isSearching && searchResults?.length === 0 && (
            <p className="px-4 py-3 text-xs text-muted-foreground">No results for "{searchQuery}"</p>
          )}

          <div className="flex-1 overflow-auto" ref={listContainerRef} onScroll={handleListScroll}>
            <ConversationList
              conversations={displayConversations}
              selectedId={selectedConversation?.id}
              matchedPreviews={matchedPreviews}
              onSelect={(conv) => {
                const match = searchResults?.find(r => r.conversation.id === conv.id);
                setScrollToMessageId(match?.matchedMessageId);
                setSelectedConversation(conv);
                navigate(`/conversations/${conv.id}`, { replace: true });
              }}
            />
            {isLoadingMore && (
              <div className="flex items-center justify-center p-3 text-xs text-muted-foreground gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading more…
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-3 border-t border-border space-y-2">
          {agentProfile && (
            <AgentComplaintDialog
              agentId={agentProfile.id}
              assignedPropertyIds={assignedPropertyIds}
            />
          )}
          <Button variant="outline" className="w-full" onClick={() => navigate('/account')}>
            <Settings className="h-4 w-4 mr-2" />
            Account Settings
          </Button>
          {canSwitchToAdmin && (
            <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Admin Panel
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatPanel
          conversation={selectedConversation}
          onSendMessage={handleSendMessage}
          onCloseConversation={handleCloseConversation}
          isAIEnabled={isAIEnabled}
          onToggleAI={handleToggleAI}
          aiQueuedAt={aiQueuedAt}
          aiQueuedWindowMs={aiQueuedWindowMs}
          aiQueuedPreview={aiQueuedPreview}
          onCancelAIQueue={handleCancelAIQueue}
          onEditAIQueue={handleEditAIQueue}
          onPauseAIQueue={handlePauseAIQueue}
          onSendNow={handleSendNow}
          scrollToMessageId={scrollToMessageId}
        />
      </div>
    </div>
  );
}
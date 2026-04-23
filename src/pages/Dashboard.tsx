import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FloatingSupportButton } from '@/components/dashboard/FloatingSupportButton';
import { NotificationsBell } from '@/components/dashboard/NotificationsBell';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MoreVertical, Trash2, Archive, Phone, Mail, User as UserIcon, ArrowLeft, Menu } from 'lucide-react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { ConversationList } from '@/components/dashboard/ConversationList';
import { ChatPanel } from '@/components/dashboard/ChatPanel';
import { useConversations, DbConversation } from '@/hooks/useConversations';
import { requestNotificationPermission } from '@/hooks/useInAppNotifications';
import { Conversation, Message } from '@/types/chat';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PropertySelector } from '@/components/PropertySelector';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuditLog } from '@/hooks/useAuditLog';
import { SidebarStateProvider, useSidebarState } from '@/hooks/useSidebarState';
import { InfoIndicator } from '@/components/docs/InfoIndicator';
import { useIsMobile } from '@/hooks/use-mobile';
type FilterStatus = 'all' | 'active' | 'closed';

// Convert DB conversation to UI conversation format
const toUiConversation = (dbConv: DbConversation): Conversation & {
  isTest?: boolean;
} => ({
  id: dbConv.id,
  propertyId: dbConv.property_id,
  propertyName: dbConv.property?.name || dbConv.property?.domain || undefined,
  visitorId: dbConv.visitor_id,
  visitor: {
    id: dbConv.visitor?.id || '',
    sessionId: dbConv.visitor?.session_id || '',
    name: dbConv.visitor?.name || undefined,
    email: dbConv.visitor?.email || undefined,
    phone: dbConv.visitor?.phone || undefined,
    age: dbConv.visitor?.age || undefined,
    occupation: dbConv.visitor?.occupation || undefined,
    propertyId: dbConv.property_id,
    browserInfo: dbConv.visitor?.browser_info || undefined,
    location: dbConv.visitor?.location || undefined,
    currentPage: dbConv.visitor?.current_page || undefined,
    createdAt: new Date(dbConv.visitor?.created_at || dbConv.created_at),
    addiction_history: dbConv.visitor?.addiction_history || undefined,
    drug_of_choice: dbConv.visitor?.drug_of_choice || undefined,
    treatment_interest: dbConv.visitor?.treatment_interest || undefined,
    insurance_info: dbConv.visitor?.insurance_info || undefined,
    urgency_level: dbConv.visitor?.urgency_level || undefined,
    gclid: dbConv.visitor?.gclid || undefined
  },
  assignedAgentId: dbConv.assigned_agent_id || undefined,
  status: dbConv.status,
  messages: (dbConv.messages || []).map(m => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    senderType: m.sender_type,
    content: m.content,
    timestamp: new Date(m.created_at),
    read: m.read
  })),
  unreadCount: (dbConv.messages || []).filter(m => !m.read && m.sender_type === 'visitor').length,
  createdAt: new Date(dbConv.created_at),
  updatedAt: new Date(dbConv.updated_at),
  isTest: dbConv.is_test || false,
  aiQueuedAt: dbConv.ai_queued_at ? new Date(dbConv.ai_queued_at) : null,
  aiQueuedPreview: dbConv.ai_queued_preview || null,
  aiQueuedPaused: dbConv.ai_queued_paused || false,
  aiQueuedWindowMs: dbConv.ai_queued_window_ms ?? null,
  missedReply: (() => {
    const msgs = dbConv.messages || [];
    const hasVisitorMsg = msgs.some(m => m.sender_type === 'visitor');
    const hasAgentMsg = msgs.some(m => m.sender_type === 'agent');
    return hasVisitorMsg && !hasAgentMsg && (dbConv.status === 'closed' || dbConv.status === 'pending');
  })(),
});
const DashboardContent = () => {
  const {
    user,
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    setCollapsed
  } = useSidebarState();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAgentMode, activeWorkspace } = useWorkspace();

  // Property filter state - used to scope data fetching
  const [propertyFilter, setPropertyFilter] = useState<string>('all');

  // Pass selectedPropertyId to hook - only fetches conversations for that property
  const {
    conversations: dbConversations,
    properties,
    loading: dataLoading,
    sendMessage,
    markMessagesAsRead,
    closeConversation,
    closeConversations,
    deleteConversation,
    deleteConversations,
    deleteProperty,
    toggleAI,
    pauseAIQueue,
    cancelAIQueue,
    editAIQueuedMessage,
    sendNowAIQueue,
  } = useConversations({ 
    selectedPropertyId: propertyFilter === 'all' ? undefined : propertyFilter,
    workspaceOwnerId: isAgentMode ? activeWorkspace?.id : undefined,
    agentId: isAgentMode ? activeWorkspace?.agentId : undefined,
  });

  // Determine filter from path
  const statusFilter = useMemo((): FilterStatus => {
    if (location.pathname === '/dashboard/active') return 'active';
    if (location.pathname === '/dashboard/closed') return 'closed';
    return 'all';
  }, [location.pathname]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    requestNotificationPermission();
    document.title = 'Allocation Assist';
    return () => { document.title = 'Allocation Assist'; };
  }, []);

  // Redirect to onboarding if no properties - only after BOTH auth and data have fully loaded
  // Use a ref to ensure we only check once per mount to prevent random redirects
  const onboardingCheckedRef = useRef(false);
  
  useEffect(() => {
    // Wait until everything is fully loaded before checking
    if (authLoading || dataLoading) return;
    if (!user) return;
    if (onboardingCheckedRef.current) return;
    
    // Double-check: query the profile to see if onboarding is complete
    const checkAndRedirect = async () => {
      onboardingCheckedRef.current = true;
      
      if (properties.length === 0) {
        // Verify via RPC as a safety net
        const { data: isComplete } = await supabase.rpc('check_onboarding_complete', { user_uuid: user.id });
        if (!isComplete) {
          navigate('/onboarding');
        }
      }
    };
    
    checkAndRedirect();
  }, [authLoading, dataLoading, user, properties.length, navigate]);

  // Persist selected conversation in URL search params so it survives tab switches
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle deep link from Slack (?conversation=<id>) → normalize to ?c=<id>
  useEffect(() => {
    const deepLinkId = searchParams.get('conversation');
    if (deepLinkId) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('c', deepLinkId);
        next.delete('conversation');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const selectedConversationId = searchParams.get('c') || null;
  const setSelectedConversationId = useCallback((id: string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (id) {
        next.set('c', id);
      } else {
        next.delete('c');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const [searchQuery, setSearchQuery] = useState('');
  const [leadFilters, setLeadFilters] = useState<Set<'phone' | 'email' | 'name'>>(new Set());

  const toggleLeadFilter = (filter: 'phone' | 'email' | 'name') => {
    setLeadFilters(prev => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  };

  // Convert DB conversations to UI format
  const conversations = useMemo(() => dbConversations.map(toUiConversation), [dbConversations]);

  // Get selected conversation
  const selectedConversation = useMemo(() => conversations.find(c => c.id === selectedConversationId) || null, [conversations, selectedConversationId]);
  
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Filter by status based on path
      if (statusFilter === 'active' && conv.status === 'closed') return false;
      if (statusFilter === 'closed' && conv.status !== 'closed') return false;

      // Lead capture filters (only apply in closed view)
      if (leadFilters.size > 0) {
        if (leadFilters.has('phone') && !conv.visitor.phone) return false;
        if (leadFilters.has('email') && !conv.visitor.email) return false;
        if (leadFilters.has('name') && !conv.visitor.name) return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const visitorName = conv.visitor.name?.toLowerCase() || '';
        const visitorEmail = conv.visitor.email?.toLowerCase() || '';
        const lastMessage = conv.lastMessage?.content.toLowerCase() || '';
        if (!visitorName.includes(query) && !visitorEmail.includes(query) && !lastMessage.includes(query)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Sort by the most recent message timestamp, falling back to updatedAt
      const getLatestTime = (conv: typeof a) => {
        if (conv.messages.length === 0) return conv.updatedAt.getTime();
        return Math.max(...conv.messages.map(m => m.timestamp.getTime()));
      };
      return getLatestTime(b) - getLatestTime(a);
    });
  }, [conversations, statusFilter, searchQuery, leadFilters]);

  // Add lastMessage to conversations
  const conversationsWithLastMessage = useMemo(
    () =>
      filteredConversations.map((conv) => ({
        ...conv,
        lastMessage: conv.messages[conv.messages.length - 1],
      })),
    [filteredConversations]
  );

  const sidebarBadgeCounts = useMemo(() => {
    const unreadConversations = dbConversations.filter((c) =>
      c.messages?.some((m) => !m.read && m.sender_type === 'visitor')
    ).length;

    const activeCount = dbConversations.filter((c) => c.status !== 'closed').length;

    return { all: unreadConversations, active: activeCount };
  }, [dbConversations]);
  const { logAccess } = useAuditLog();

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    setCollapsed(true);
    await markMessagesAsRead(conversation.id);
    
    // Audit log: viewing visitor PHI
    const phiFields = ['name', 'email', 'phone', 'addiction_history', 'drug_of_choice', 'treatment_interest', 'insurance_info', 'urgency_level'].filter(
      f => (conversation.visitor as any)?.[f]
    );
    if (phiFields.length > 0) {
      logAccess({
        action: 'view',
        resource_type: 'visitor',
        resource_id: conversation.visitorId,
        property_id: conversation.propertyId,
        phi_fields_accessed: phiFields,
      });
    }
  };
  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || !user) return;
    // When in agent mode, assign conversation to the agent on first reply
    const assignId = isAgentMode ? activeWorkspace?.agentId : undefined;
    await sendMessage(selectedConversation.id, content, user.id, assignId);
  };
  const handleCloseConversation = async () => {
    if (!selectedConversation) return;
    await closeConversation(selectedConversation.id);
  };
  const handleDeleteConversation = async (conversationId: string) => {
    if (selectedConversationId === conversationId) {
      setSelectedConversationId(null);
    }
    await deleteConversation(conversationId);
  };
  const handleBulkClose = async (conversationIds: string[]) => {
    if (selectedConversationId && conversationIds.includes(selectedConversationId)) {
      setSelectedConversationId(null);
    }
    return await closeConversations(conversationIds);
  };
  const handleBulkDelete = async (conversationIds: string[]) => {
    if (selectedConversationId && conversationIds.includes(selectedConversationId)) {
      setSelectedConversationId(null);
    }
    return await deleteConversations(conversationIds);
  };
  const handleCreateTestConversation = async () => {
    if (!user || properties.length === 0) {
      toast.error('No properties available');
      return;
    }
    const propertyId = properties[0].id;
    const sessionId = `test-session-${Date.now()}`;
    try {
      // Create a test visitor
      const {
        data: visitor,
        error: visitorError
      } = await supabase.from('visitors').insert({
        property_id: propertyId,
        session_id: sessionId,
        name: `Test Visitor ${Math.floor(Math.random() * 1000)}`,
        email: `visitor-${Date.now()}@test.local`,
        current_page: 'https://example.com/test-page',
        browser_info: 'Test Browser',
        location: 'Test Location'
      }).select().single();
      if (visitorError) {
        toast.error('Failed to create visitor: ' + visitorError.message);
        return;
      }

      // Create a test conversation
      const {
        data: conversation,
        error: convError
      } = await supabase.from('conversations').insert({
        property_id: propertyId,
        visitor_id: visitor.id,
        status: 'pending'
      }).select().single();
      if (convError) {
        toast.error('Failed to create conversation: ' + convError.message);
        return;
      }

      // Add some test messages
      const testMessages = [{
        sender_type: 'visitor',
        sender_id: visitor.id,
        content: 'Hello, I need help with something.'
      }, {
        sender_type: 'visitor',
        sender_id: visitor.id,
        content: 'Is anyone available to chat?'
      }];
      for (const msg of testMessages) {
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          ...msg
        });
      }
      toast.success('Test conversation created! Refresh to see it.');
    } catch (error) {
      console.error('Error creating test conversation:', error);
      toast.error('Failed to create test conversation');
    }
  };

  // AI toggle for conversations - use persisted value from database
  const selectedDbConversation = dbConversations.find(c => c.id === selectedConversationId);
  const isAIEnabled = selectedDbConversation?.ai_enabled ?? true;
  const aiQueuedAt = selectedDbConversation?.ai_queued_at ? new Date(selectedDbConversation.ai_queued_at) : null;
  const aiQueuedWindowMs = selectedDbConversation?.ai_queued_window_ms ?? null;
  const aiQueuedPreview = selectedDbConversation?.ai_queued_preview ?? null;
  const aiQueuedPaused = selectedDbConversation?.ai_queued_paused ?? false;
  
  const handleToggleAI = async () => {
    if (!selectedConversationId) return;
    await toggleAI(selectedConversationId, !isAIEnabled);
  };

  const handlePauseAIQueue = async (paused: boolean) => {
    if (!selectedConversationId) return;
    await pauseAIQueue(selectedConversationId, paused);
  };

  const handleCancelAIQueue = async () => {
    if (!selectedConversationId) return;
    await cancelAIQueue(selectedConversationId);
  };

  const handleSendNow = async () => {
    if (!selectedConversationId) return;
    await sendNowAIQueue(selectedConversationId);
  };

  const handleEditAIQueue = async (messageId: string, newContent: string) => {
    if (!selectedConversationId) return;
    await editAIQueuedMessage(selectedConversationId, newContent, messageId);
  };
  const getStatusTitle = () => {
    switch (statusFilter) {
      case 'active':
        return 'Active';
      case 'closed':
        return 'Closed';
      default:
        return 'All';
    }
  };
  const isClosedView = statusFilter === 'closed';
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const loading = authLoading || dataLoading;
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-foreground">Loading dashboard</p>
            <p className="text-xs text-muted-foreground">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }
  return <div ref={containerRef} className="flex h-screen bg-gradient-subtle overflow-hidden page-enter">
      <DashboardTour />
      <DashboardSidebar badgeCounts={sidebarBadgeCounts} mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Unified Header */}
        <div className="flex shrink-0 bg-sidebar text-sidebar-foreground pl-2">
          {/* Mobile hamburger */}
          {isMobile && !selectedConversationId && (
            <div className="flex items-center px-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/60 hover:bg-sidebar-accent" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          )}
          {/* Conversation List Header */}
          <div className={cn("px-4 py-3 border-r border-sidebar-border shrink-0", isMobile ? "flex-1" : "w-80", selectedConversationId && "hidden md:block")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-semibold text-sidebar-foreground">{getStatusTitle()}</h2>
                <InfoIndicator 
                  to="/documentation/inbox/conversations" 
                  variant="header"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <NotificationsBell variant="header" />
                {totalUnread > 0 && <span className="text-xs text-sidebar-primary font-medium bg-sidebar-primary/20 px-2 py-0.5 rounded-full">
                    {totalUnread}
                  </span>}
                {/* Property Selector */}
                <PropertySelector
                  properties={properties}
                  selectedPropertyId={propertyFilter === 'all' ? undefined : propertyFilter}
                  onPropertyChange={(id) => setPropertyFilter(id)}
                  onDeleteProperty={deleteProperty}
                  showIcon={false}
                  className="w-auto max-w-[150px] h-8 text-xs"
                  variant="header"
                  showAllOption={true}
                  showAddButton
                />
              </div>
            </div>
          </div>

          {/* Chat Panel Header */}
          <div className={cn("flex-1 px-4 py-3 border-r border-sidebar-border flex items-center justify-between min-w-0", !selectedConversationId && "hidden md:flex")}>
            {selectedConversation && <>
                <div className="flex items-center gap-3 min-w-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden text-sidebar-foreground/60 hover:bg-sidebar-accent flex-shrink-0" onClick={() => setSelectedConversationId(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs">
                      {(selectedConversation.visitor.name || `Visitor ${selectedConversation.visitor.sessionId.slice(-4)}`).split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sidebar-foreground truncate text-sm">
                      {selectedConversation.visitor.name || `Visitor ${selectedConversation.visitor.sessionId.slice(-4)}`}
                    </h3>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {selectedConversation.visitor.currentPage || 'Browsing'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("capitalize text-xs border-sidebar-border", selectedConversation.status === 'active' && "border-status-online text-status-online bg-status-online/10", selectedConversation.status === 'pending' && "border-status-away text-status-away bg-status-away/10", selectedConversation.status === 'closed' && "border-sidebar-foreground/50 text-sidebar-foreground/50")}>
                    {selectedConversation.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/60 hover:bg-sidebar-accent">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={handleCloseConversation} disabled={selectedConversation.status === 'closed'}>
                        <Archive className="h-4 w-4 mr-2" />
                        Close Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteConversation(selectedConversation.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>}
          </div>

          {/* Visitor Details Header */}
          <div className="w-64 px-4 py-3 hidden lg:flex items-center shrink-0 mr-2">
            {selectedConversation && <h4 className="font-medium text-sm text-sidebar-foreground">Visitor Details</h4>}
          </div>
        </div>

        {/* Main Content Row */}
        <div className="flex flex-1 min-h-0 overflow-hidden p-0 md:p-2 bg-sidebar">
          <div className="flex flex-1 min-h-0 overflow-hidden md:rounded-lg md:border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm">
            {/* Conversation List Column */}
            <div ref={listRef} data-tour="conversation-list" className={cn("w-full md:w-80 border-r border-border/30 flex flex-col md:shrink-0", selectedConversationId && "hidden md:flex")}>
              {/* Search - White/light background */}
              <div className="px-4 py-3 border-b border-border/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-9 bg-muted/50 border-border/30 text-foreground placeholder:text-muted-foreground focus:bg-background transition-colors rounded-xl" />
                </div>
              </div>

              {/* Lead Capture Filters - only in closed view */}
              {isClosedView && (
                <div className="px-3 py-2 border-b border-border/30 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mr-1">Leads:</span>
                  <button
                    onClick={() => toggleLeadFilter('name')}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                      leadFilters.has('name')
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
                    )}
                  >
                    <UserIcon className="h-3 w-3" />
                    Name
                  </button>
                  <button
                    onClick={() => toggleLeadFilter('email')}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                      leadFilters.has('email')
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
                    )}
                  >
                    <Mail className="h-3 w-3" />
                    Email
                  </button>
                  <button
                    onClick={() => toggleLeadFilter('phone')}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                      leadFilters.has('phone')
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
                    )}
                  >
                    <Phone className="h-3 w-3" />
                    Phone
                  </button>
                </div>
              )}

              {/* List */}
              <ConversationList conversations={conversationsWithLastMessage} selectedId={selectedConversation?.id} onSelect={handleSelectConversation} showDelete={isClosedView} onDelete={handleDeleteConversation} onBulkClose={handleBulkClose} onBulkDelete={handleBulkDelete} showBulkActions={true} />
            </div>

            {/* Chat Panel */}
            <div className={cn("flex-1 min-w-0", !selectedConversationId && "hidden md:block")}>
              <ChatPanel 
                conversation={selectedConversation} 
                onSendMessage={handleSendMessage} 
                onCloseConversation={handleCloseConversation}
                isAIEnabled={isAIEnabled}
                onToggleAI={handleToggleAI}
                propertyName={selectedConversation ? properties.find(p => p.id === selectedConversation.propertyId)?.name : undefined}
                aiQueuedAt={aiQueuedAt}
                aiQueuedWindowMs={aiQueuedWindowMs}
                aiQueuedPreview={aiQueuedPreview}
                onCancelAIQueue={handleCancelAIQueue}
                onEditAIQueue={handleEditAIQueue}
                onPauseAIQueue={handlePauseAIQueue}
                onSendNow={handleSendNow}
              />
            </div>
          </div>
        </div>
      </div>
      <FloatingSupportButton />
    </div>;
};
const Dashboard = () => <SidebarStateProvider>
    <DashboardContent />
  </SidebarStateProvider>;
export default Dashboard;
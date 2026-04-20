import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Workspace {
  id: string; // For own workspace: user's id. For agent workspace: the invited_by user id
  name: string; // company name or full name of the workspace owner
  type: 'owner' | 'agent';
  avatarUrl?: string | null;
  agentId?: string; // The agents table id when type is 'agent'
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  switchWorkspace: (workspaceId: string) => void;
  isAgentMode: boolean; // true when viewing another admin's workspace as an agent
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const ACTIVE_WORKSPACE_KEY = 'care-assist-active-workspace';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, isClient, isAdmin, isAgent } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchedUserId = useRef<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setLoading(false);
      lastFetchedUserId.current = null;
      return;
    }

    // Skip refetch if data is already loaded for this user
    if (lastFetchedUserId.current === user.id && workspaces.length > 0) {
      return;
    }

    setLoading(true);
    const result: Workspace[] = [];

    // 1. Own workspace (if client or admin)
    if (isClient || isAdmin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      result.push({
        id: user.id,
        name: profile?.company_name || profile?.full_name || user.email?.split('@')[0] || 'My Workspace',
        type: 'owner',
        avatarUrl: profile?.avatar_url,
      });
    }

    // 1b. Co-owner workspaces — accounts where this user is a co-owner
    const { data: coOwnerRecords } = await supabase
      .from('account_co_owners')
      .select('owner_user_id')
      .eq('co_owner_user_id', user.id);

    if (coOwnerRecords && coOwnerRecords.length > 0) {
      const ownerIds = coOwnerRecords.map(r => r.owner_user_id).filter(id => id !== user.id);
      if (ownerIds.length > 0) {
        const { data: ownerProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, company_name, avatar_url')
          .in('user_id', ownerIds);

        if (ownerProfiles) {
          for (const profile of ownerProfiles) {
            result.push({
              id: profile.user_id,
              name: profile.company_name || profile.full_name || 'Shared Workspace',
              type: 'owner', // co-owners get full owner experience
              avatarUrl: profile.avatar_url,
            });
          }
        }
      }
    }

    // 2. Agent workspaces - find all admins who invited this user as an agent
    const { data: agentRecords } = await supabase
      .from('agents')
      .select('id, invited_by')
      .eq('user_id', user.id)
      .eq('invitation_status', 'accepted');

    if (agentRecords && agentRecords.length > 0) {
      const agentByOwner = new Map<string, string>();
      for (const a of agentRecords) {
        if (a.invited_by) agentByOwner.set(a.invited_by, a.id);
      }
      const ownerIds = [...agentByOwner.keys()];
      
      // Don't include own workspace or co-owner workspaces again
      const existingIds = new Set(result.map(w => w.id));
      const otherOwnerIds = ownerIds.filter(id => !existingIds.has(id));

      if (otherOwnerIds.length > 0) {
        const { data: ownerProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, company_name, avatar_url')
          .in('user_id', otherOwnerIds);

        if (ownerProfiles) {
          for (const profile of ownerProfiles) {
            result.push({
              id: profile.user_id,
              name: profile.company_name || profile.full_name || 'Workspace',
              type: 'agent',
              avatarUrl: profile.avatar_url,
              agentId: agentByOwner.get(profile.user_id),
            });
          }
        }
      }
    }

    // 3. If pure agent (no own workspace), check for agent invitations
    if (!isClient && !isAdmin && isAgent) {
      // The agent workspaces are already added above
    }

    setWorkspaces(result);
    lastFetchedUserId.current = user.id;

    // Restore saved workspace or default to first
    const saved = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    const savedExists = result.find(w => w.id === saved);
    if (savedExists) {
      setActiveWorkspaceId(saved);
    } else if (result.length > 0) {
      setActiveWorkspaceId(result[0].id);
    }

    setLoading(false);
  }, [user, isClient, isAdmin, isAgent]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const switchWorkspace = useCallback((workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
  }, []);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0] || null;
  const isAgentMode = activeWorkspace?.type === 'agent';

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        switchWorkspace,
        isAgentMode,
        loading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

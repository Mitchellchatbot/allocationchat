import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImpersonatedUser {
  id: string;
  email: string;
  name: string;
  company: string;
}

interface ImpersonationContextType {
  impersonating: ImpersonatedUser | null;
  startImpersonation: (userId: string, navigate: (path: string) => void) => Promise<void>;
  stopImpersonation: (navigate?: (path: string) => void) => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  impersonating: null,
  startImpersonation: async () => {},
  stopImpersonation: async () => {},
});

const REAL_SESSION_KEY = 'care-assist-admin-real-session';
const IMPERSONATING_USER_KEY = 'care-assist-impersonating-user';

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonating, setImpersonating] = useState<ImpersonatedUser | null>(() => {
    try {
      const stored = localStorage.getItem(IMPERSONATING_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const startImpersonation = useCallback(async (userId: string, navigate: (path: string) => void) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('No active session'); return; }

    // Save real session before switching
    localStorage.setItem(REAL_SESSION_KEY, JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }));

    const { data, error } = await supabase.functions.invoke('admin-impersonate', {
      body: { targetUserId: userId },
    });

    if (error || !data?.token) {
      localStorage.removeItem(REAL_SESSION_KEY);
      toast.error('Failed to start impersonation session');
      return;
    }

    const impUser: ImpersonatedUser = data.user;
    setImpersonating(impUser);
    localStorage.setItem(IMPERSONATING_USER_KEY, JSON.stringify(impUser));

    await supabase.auth.setSession({
      access_token: data.token,
      refresh_token: data.token,
    });

    navigate('/dashboard');
  }, []);

  const stopImpersonation = useCallback(async (navigate?: (path: string) => void) => {
    const realSessionStr = localStorage.getItem(REAL_SESSION_KEY);

    setImpersonating(null);
    localStorage.removeItem(IMPERSONATING_USER_KEY);
    localStorage.removeItem(REAL_SESSION_KEY);

    if (realSessionStr) {
      const real = JSON.parse(realSessionStr);
      await supabase.auth.setSession({
        access_token: real.access_token,
        refresh_token: real.refresh_token,
      });
    }

    if (navigate) navigate('/admin');
  }, []);

  return (
    <ImpersonationContext.Provider value={{ impersonating, startImpersonation, stopImpersonation }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export const useImpersonation = () => useContext(ImpersonationContext);

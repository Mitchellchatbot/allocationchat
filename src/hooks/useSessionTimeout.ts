import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { KEEP_SIGNED_IN_KEY } from '@/pages/Auth';

const DEFAULT_TIMEOUT_MINUTES = 15;

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutMinutesRef = useRef(DEFAULT_TIMEOUT_MINUTES);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const handleLogout = useCallback(async () => {
    clearTimers();
    toast.info('Session expired due to inactivity. Please sign in again.');
    await signOut();
  }, [signOut, clearTimers]);

  const resetTimer = useCallback(() => {
    clearTimers();
    if (!user) return;
    if (localStorage.getItem(KEEP_SIGNED_IN_KEY) === 'true') return;

    const timeoutMs = timeoutMinutesRef.current * 60 * 1000;
    timeoutRef.current = setTimeout(handleLogout, timeoutMs);
  }, [user, clearTimers, handleLogout]);

  useEffect(() => {
    if (!user) return;
    resetTimer();
  }, [user, resetTimer]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    let lastActivity = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity > 30000) {
        lastActivity = now;
        resetTimer();
      }
    };

    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
    return () => {
      clearTimers();
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [user, resetTimer, clearTimers]);

  return { resetTimer };
}

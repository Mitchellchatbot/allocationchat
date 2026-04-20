import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Persists form state to localStorage so unsaved changes survive page reloads.
 *
 * @param key   Unique storage key (e.g. "business-info-{propertyId}")
 * @param serverData  Data fetched from the server (null while loading)
 * @param isLoading   Whether the server fetch is still in progress
 * @returns [formState, setFormState, clearDraft, hasDraft]
 */
export function useFormDraft<T>(
  key: string,
  serverData: T | null,
  isLoading: boolean,
): [T | null, React.Dispatch<React.SetStateAction<T | null>>, () => void, boolean] {
  const storageKey = `draft-${key}`;
  const [state, setState] = useState<T | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const initialised = useRef(false);

  // Once server data arrives, merge with any existing draft
  useEffect(() => {
    if (isLoading || initialised.current) return;
    initialised.current = true;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw) as T;
        setState(draft);
        setHasDraft(true);
        return;
      }
    } catch {
      // corrupt draft — ignore
      localStorage.removeItem(storageKey);
    }

    setState(serverData);
  }, [isLoading, serverData, storageKey]);

  // Reset when key changes (different property selected)
  useEffect(() => {
    initialised.current = false;
    isFirstRender.current = true;
    setHasDraft(false);
    setState(null);
    // Also clear any stale draft for the new key
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        localStorage.removeItem(storageKey);
      }
    } catch { /* ignore */ }
  }, [key]);

  // Persist draft to localStorage on every state change (after init)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (state != null) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        // storage full — silently fail
      }
    }
  }, [state, storageKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasDraft(false);
  }, [storageKey]);

  return [state, setState, clearDraft, hasDraft];
}

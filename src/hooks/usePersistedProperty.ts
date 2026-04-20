import { useState, useCallback } from 'react';

const STORAGE_KEY = 'scaledbot_selected_property';

/**
 * Hook that persists the selected property ID in sessionStorage
 * so it survives sidebar navigation between dashboard pages.
 */
export const usePersistedProperty = (initialValue = '') => {
  const [selectedPropertyId, setSelectedPropertyIdState] = useState<string>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) || initialValue;
    } catch {
      return initialValue;
    }
  });

  const setSelectedPropertyId = useCallback((id: string) => {
    setSelectedPropertyIdState(id);
    try {
      sessionStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Ignore storage errors
    }
  }, []);

  return [selectedPropertyId, setSelectedPropertyId] as const;
};

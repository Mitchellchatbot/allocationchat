import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';

interface SidebarStateContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarStateContext = createContext<SidebarStateContextType | undefined>(undefined);

export const SidebarStateProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from localStorage
  const [collapsed, setCollapsedState] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === 'true';
  });

  // Persist to localStorage when changed
  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState(prev => {
      const newValue = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  return (
    <SidebarStateContext.Provider value={{ collapsed, setCollapsed, toggleCollapsed }}>
      {children}
    </SidebarStateContext.Provider>
  );
};

// Hook that works both with and without a provider
// When used without provider, it manages local state with localStorage persistence
export const useSidebarState = () => {
  const context = useContext(SidebarStateContext);
  
  const [localCollapsed, setLocalCollapsedState] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === 'true';
  });
  
  const setLocalCollapsed = useCallback((value: boolean) => {
    setLocalCollapsedState(value);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
  }, []);
  
  const toggleLocal = useCallback(() => {
    setLocalCollapsedState(prev => {
      const newValue = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);
  
  // If we have a context, use it; otherwise use local state
  if (context !== undefined) {
    return context;
  }
  
  return {
    collapsed: localCollapsed,
    setCollapsed: setLocalCollapsed,
    toggleCollapsed: toggleLocal,
  };
};

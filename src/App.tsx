import { useEffect, lazy, Suspense } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { WorkspaceProvider } from "./hooks/useWorkspace";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { ScrollToTop } from "./components/ScrollToTop";
import { PageLoader } from "./components/ui/loading";
import { FeatureAnnouncementModal } from "./components/FeatureAnnouncementModal";

// Global handler to catch unhandled promise rejections
const useGlobalErrorHandlers = () => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("[Unhandled Rejection]", event.reason);
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error("[Uncaught Error]", event.error || event.message);
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);
};

// Eagerly loaded pages (critical path)
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

// Lazy loaded pages (code splitting)
const WidgetPreview = lazy(() => import("./pages/WidgetPreview"));
const Analytics = lazy(() => import("./pages/Analytics"));
const TeamMembers = lazy(() => import("./pages/TeamMembers"));
const AISupport = lazy(() => import("./pages/AISupport"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Support = lazy(() => import("./pages/Support"));
const Zoho = lazy(() => import("./pages/Zoho"));
const Notifications = lazy(() => import("./pages/Notifications"));
const SlackApp = lazy(() => import("./pages/SlackApp"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));
const WidgetEmbed = lazy(() => import("./pages/WidgetEmbed"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Properties = lazy(() => import("./pages/Properties"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 minutes
      gcTime: 30 * 60 * 1000,     // 30 minutes — keep cache alive across tab switches
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,   // survives tab discards and page reloads
});
// Route guard for clients only
const RequireClient = ({ children }: { children: React.ReactNode }) => {
  const { user, isClient, isAdmin, isAgent, hasAgentAccess, loading } = useAuth();
  useSessionTimeout();

  if (loading) return <PageLoader />;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isClient && !isAdmin) {
    // Agent-only users who landed here should go to their own dashboard
    if (isAgent || hasAgentAccess) {
      return <Navigate to="/conversations" replace />;
    }
    // Logged in but no valid role — send to auth to refresh session
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <FeatureAnnouncementModal />
      {children}
    </>
  );
};

// Route guard for agents (or users with agent access)
const RequireAgent = ({ children }: { children: React.ReactNode }) => {
  const { user, isAgent, hasAgentAccess, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Allow if role is agent OR user has accepted agent invitations
  if (!isAgent && !hasAgentAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/auth" replace />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/conversations" element={<RequireAgent><AgentDashboard /></RequireAgent>} />
        <Route path="/conversations/:conversationId" element={<RequireAgent><AgentDashboard /></RequireAgent>} />
        <Route path="/account" element={<AccountSettings />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Client routes */}
        <Route path="/dashboard" element={<RequireClient><Dashboard /></RequireClient>} />
        <Route path="/dashboard/active" element={<RequireClient><Dashboard /></RequireClient>} />
        <Route path="/dashboard/closed" element={<RequireClient><Dashboard /></RequireClient>} />
        <Route path="/dashboard/team" element={<RequireClient><TeamMembers /></RequireClient>} />
        <Route path="/dashboard/ai-support" element={<RequireClient><AISupport /></RequireClient>} />
        <Route path="/dashboard/properties" element={<RequireClient><Properties /></RequireClient>} />
        <Route path="/dashboard/analytics" element={<RequireClient><Analytics /></RequireClient>} />
        <Route path="/dashboard/widget" element={<RequireClient><WidgetPreview /></RequireClient>} />
        <Route path="/dashboard/zoho" element={<RequireClient><Zoho /></RequireClient>} />
        <Route path="/dashboard/notifications" element={<RequireClient><Notifications /></RequireClient>} />
        <Route path="/dashboard/support" element={<RequireClient><Support /></RequireClient>} />
        <Route path="/dashboard/account" element={<RequireClient><AccountSettings /></RequireClient>} />
        
        <Route path="/widget-preview" element={<WidgetPreview />} />
        <Route path="/widget-embed/:propertyId" element={<WidgetEmbed />} />
        <Route path="/slack-app" element={<SlackApp />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  useGlobalErrorHandlers();
  
  return (
    <ErrorBoundary>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 10 * 60 * 1000 }}>
        <AuthProvider>
          <ImpersonationProvider>
          <WorkspaceProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </WorkspaceProvider>
          </ImpersonationProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

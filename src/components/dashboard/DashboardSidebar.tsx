import { useMemo, useState } from 'react';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageSquare,
  Users, 
  BarChart3, 
  Code, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Archive,
  
  LifeBuoy,
  Bot,
  BookOpen,
  CreditCard,
  Building2,
  Menu,
  Shield,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useSidebarState } from '@/hooks/useSidebarState';

import { useIsMobile } from '@/hooks/use-mobile';

import salesforceLogo from '@/assets/logos/salesforce.svg';
import gmailLogo from '@/assets/logos/gmail.svg';
import careAssistLogo from '@/assets/care-assist-icon.png';
import subscriptionCardLogo from '@/assets/logos/subscription-card.svg';
import { UserAvatarUpload } from '@/components/sidebar/UserAvatarUpload';
import { WorkspaceSwitcher } from '@/components/sidebar/WorkspaceSwitcher';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  collapsed: boolean;
  dataTour?: string;
  iconColor?: string;
}

const SidebarItem = ({ to, icon: Icon, label, badge, collapsed, dataTour, iconColor }: SidebarItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  const linkContent = (
    <NavLink
      to={to}
      data-tour={dataTour}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group",
        "hover:bg-sidebar-accent",
        isActive 
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" 
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-full" />
      )}
      <div 
        className={cn(
          "h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-105",
          isActive && "ring-1 ring-black/[0.04] shadow-sm"
        )}
        style={{ 
          backgroundColor: iconColor ? `${iconColor}12` : 'hsl(var(--sidebar-accent))',
          ...(iconColor ? { borderColor: `${iconColor}18` } : {}),
        }}
      >
        <Icon
          className={cn(
            "h-4 w-4 transition-all duration-200",
            !iconColor && (isActive 
              ? "text-sidebar-primary" 
              : "text-sidebar-foreground/50 group-hover:text-sidebar-primary"),
          )}
          style={iconColor ? { color: iconColor } : undefined}
        />
      </div>
      {!collapsed && (
        <>
          <span className={cn(
            "flex-1 transition-colors", 
            isActive ? "font-semibold text-sidebar-foreground" : "font-medium"
          )}>
            {label}
          </span>
          {badge && badge > 0 && (
            <span className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full min-w-[24px] text-center shadow-sm">
              {badge}
            </span>
          )}
        </>
      )}
      {collapsed && badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-pulse">
          {badge}
        </span>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {label}
          {badge && badge > 0 && ` (${badge})`}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
};

const SidebarSection = ({ title, children, collapsed }: { title: string; children: React.ReactNode; collapsed: boolean }) => (
  <div className="space-y-1">
    {!collapsed && (
      <div className="flex items-center gap-2 px-3 mb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-sidebar-foreground/70">
          {title}
        </h3>
        <div className="flex-1 h-px bg-sidebar-border/50" />
      </div>
    )}
    {children}
  </div>
);

export const DashboardSidebar = ({
  badgeCounts,
  mobileOpen,
  onMobileOpenChange,
}: {
  badgeCounts?: { all?: number; active?: number };
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}) => {
  const { collapsed, setCollapsed } = useSidebarState();
  const navigate = useNavigate();
  const { profile, updateAvatarUrl } = useUserProfile();
  const { signOut, user, isClient, isAgent, isAdmin, hasAgentAccess } = useAuth();
  const { isAgentMode, workspaces } = useWorkspace();
  const { impersonating, stopImpersonation } = useImpersonation();
  const isMobile = useIsMobile();

  // In agent mode, show only agent-level sidebar items
  const showAdminItems = (isClient || isAdmin) && !isAgentMode;
  
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const resolvedBadgeCounts = useMemo(() => {
    return {
      all: badgeCounts?.all ?? 0,
      active: badgeCounts?.active ?? 0,
    };
  }, [badgeCounts?.all, badgeCounts?.active]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const sidebarContent = (forMobile: boolean) => (
    <TooltipProvider>
      <aside 
        className={cn(
          "h-full flex flex-col bg-sidebar text-sidebar-foreground",
          !forMobile && "border-r border-sidebar-border shadow-sm transition-all duration-300",
          !forMobile && (collapsed ? "w-14 sm:w-[72px]" : "w-72"),
          forMobile && "w-full"
        )}
      >
        {/* Logo */}
        <div 
          data-tour="sidebar-logo"
          className={cn(
            "h-16 flex items-center border-b border-sidebar-border px-4",
            !forMobile && collapsed ? "justify-center" : "justify-between"
          )}
        >
          {(!forMobile && collapsed) ? (
            <img src={careAssistLogo} alt="Care Assist" className="w-10 h-10 rounded-xl object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <img src={careAssistLogo} alt="Care Assist" className="w-8 h-8 rounded-lg object-contain" />
              <span className="font-bold text-lg text-sidebar-foreground">Care Assist</span>
            </div>
          )}
          {!forMobile && !collapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCollapsed(!collapsed)}
                  className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Collapse sidebar
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* Expand button when collapsed (desktop only) */}
        {!forMobile && collapsed && (
          <div className="flex justify-center py-2 border-b border-sidebar-border">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCollapsed(false)}
                  className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Expand sidebar
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Impersonation banner */}
        {impersonating && (forMobile || !collapsed) && (
          <div className="mx-3 my-2 p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-lg">
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Viewing as</p>
            <p className="text-sm font-semibold text-foreground truncate">{impersonating.company}</p>
            <p className="text-xs text-muted-foreground truncate">{impersonating.email}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1.5 h-7 w-full text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/20 border border-amber-500/30"
              onClick={() => stopImpersonation(navigate)}
            >
              Exit to Admin Portal
            </Button>
          </div>
        )}

        {/* Role Switcher for users with both admin + agent access */}
        {hasAgentAccess && (isClient || isAdmin) && (
          <div className={cn(
            "border-b border-sidebar-border px-3 py-2",
            !forMobile && collapsed ? "px-1.5" : ""
          )}>
            {workspaces.length > 1 ? (
              <WorkspaceSwitcher collapsed={!forMobile && collapsed} />
            ) : (
              /* Fallback toggle when workspace switcher isn't available */
              <div className="flex items-center justify-center">
                {(!forMobile && collapsed) ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg border-sidebar-border text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        onClick={() => navigate(isAgentMode ? '/dashboard' : '/conversations')}
                      >
                        {isAgentMode ? <Building2 className="h-4 w-4" /> : <Inbox className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {isAgentMode ? 'Switch to Admin' : 'Switch to Agent'}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-9 rounded-lg border-sidebar-border text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs font-medium"
                    onClick={() => navigate(isAgentMode ? '/dashboard' : '/conversations')}
                  >
                    {isAgentMode ? (
                      <>
                        <Building2 className="h-3.5 w-3.5" />
                        Switch to Admin View
                      </>
                    ) : (
                      <>
                        <Inbox className="h-3.5 w-3.5" />
                        Switch to Agent View
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Workspace Switcher for users without dual role */}
        {workspaces.length > 1 && !(hasAgentAccess && (isClient || isAdmin)) && (
          <div className={cn(
            "border-b border-sidebar-border px-3 py-2",
            !forMobile && collapsed ? "px-1.5" : ""
          )}>
            <WorkspaceSwitcher collapsed={!forMobile && collapsed} />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-thin">
          {/* Inbox - shown in both admin and agent mode */}
          <div data-tour="inbox-section">
            <SidebarSection title="Inbox" collapsed={!forMobile && collapsed}>
              <SidebarItem to="/dashboard" icon={Inbox} label="All Conversations" badge={resolvedBadgeCounts.all > 0 ? resolvedBadgeCounts.all : undefined} collapsed={!forMobile && collapsed} iconColor="#6366F1" />
              <div data-tour="active-filter">
                <SidebarItem to="/dashboard/active" icon={MessageSquare} label="Active" badge={resolvedBadgeCounts.active > 0 ? resolvedBadgeCounts.active : undefined} collapsed={!forMobile && collapsed} iconColor="#22C55E" />
              </div>
              <SidebarItem to="/dashboard/closed" icon={Archive} label="Closed" collapsed={!forMobile && collapsed} iconColor="#94A3B8" />
            </SidebarSection>
          </div>

          {showAdminItems && (
            <SidebarSection title="Manage" collapsed={!forMobile && collapsed}>
              <div data-tour="team-members">
                <SidebarItem to="/dashboard/team" icon={Users} label="Team Members" collapsed={!forMobile && collapsed} iconColor="#8B5CF6" />
              </div>
              <div data-tour="properties-sidebar">
                <SidebarItem to="/dashboard/properties" icon={Building2} label="Business Info" collapsed={!forMobile && collapsed} iconColor="#F97316" />
              </div>
              <div data-tour="ai-support">
                <SidebarItem to="/dashboard/ai-support" icon={Bot} label="AI Support" collapsed={!forMobile && collapsed} iconColor="#06B6D4" />
              </div>
              <div data-tour="analytics-sidebar">
                <SidebarItem to="/dashboard/analytics" icon={BarChart3} label="Analytics" collapsed={!forMobile && collapsed} iconColor="#F59E0B" />
              </div>
            </SidebarSection>
          )}

          {showAdminItems && (
            <SidebarSection title="Setup" collapsed={!forMobile && collapsed}>
              <div data-tour="widget-code" data-tour-sidebar="widget-code-sidebar">
                <SidebarItem to="/dashboard/widget" icon={Code} label="Widget Code" collapsed={!forMobile && collapsed} dataTour="widget-code-sidebar" iconColor="#EC4899" />
              </div>
            </SidebarSection>
          )}

          {showAdminItems && (
            <SidebarSection title="Integrations" collapsed={!forMobile && collapsed}>
              <div data-tour="salesforce">
                <SidebarItem to="/dashboard/salesforce" icon={({ className }: { className?: string }) => <img src={salesforceLogo} alt="Salesforce" className={cn("h-[18px] w-[18px]", className)} />} label="Salesforce" collapsed={!forMobile && collapsed} iconColor="#00A1E0" />
              </div>
              <div data-tour="notifications">
                <SidebarItem to="/dashboard/notifications" icon={({ className }: { className?: string }) => <img src={gmailLogo} alt="Notifications" className={cn("h-[18px] w-[18px]", className)} />} label="Notifications" collapsed={!forMobile && collapsed} iconColor="#EA4335" />
              </div>
            </SidebarSection>
          )}

          {showAdminItems && (
            <SidebarSection title="Compliance" collapsed={!forMobile && collapsed}>
              <SidebarItem to="/dashboard/hipaa" icon={Shield} label="HIPAA" collapsed={!forMobile && collapsed} iconColor="#10B981" />
            </SidebarSection>
          )}

          {showAdminItems && (
          <SidebarSection title="Account" collapsed={!forMobile && collapsed}>
              <SidebarItem to="/dashboard/subscription" icon={({ className }: { className?: string }) => <img src={subscriptionCardLogo} alt="Subscription" className={cn("h-[18px] w-[18px]", className)} />} label="Subscription" collapsed={!forMobile && collapsed} iconColor="#F97316" />
              <SidebarItem to="/dashboard/account" icon={Settings} label="Account Settings" collapsed={!forMobile && collapsed} iconColor="#6B7280" />
            </SidebarSection>
          )}

          {showAdminItems && (
            <SidebarSection title="Support" collapsed={!forMobile && collapsed}>
              <div data-tour="get-help">
                <SidebarItem to="/dashboard/support" icon={LifeBuoy} label="Get Help" collapsed={!forMobile && collapsed} iconColor="#EF4444" />
              </div>
              <SidebarItem to="/documentation" icon={BookOpen} label="Documentation" collapsed={!forMobile && collapsed} iconColor="#14B8A6" />
            </SidebarSection>
          )}

          {isAdmin && (
            <SidebarSection title="Platform" collapsed={!forMobile && collapsed}>
              <SidebarItem to="/admin" icon={Shield} label="Admin Portal" collapsed={!forMobile && collapsed} iconColor="#DC2626" />
            </SidebarSection>
          )}


          {/* Role switcher is now at the top of the sidebar */}
        </nav>

        {/* User Profile */}
        <div className={cn(
          "border-t border-sidebar-border/80 p-3",
          !forMobile && collapsed ? "flex flex-col items-center gap-2" : ""
        )}>
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg",
            !forMobile && collapsed ? "justify-center flex-col" : ""
          )}>
            <div className="relative flex-shrink-0">
              {!forMobile && collapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div>
                      <UserAvatarUpload
                        userId={user?.id || ''}
                        avatarUrl={profile?.avatar_url}
                        initials={initials}
                        onAvatarUpdate={updateAvatarUrl}
                        size="sm"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Click to change photo</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <UserAvatarUpload
                  userId={user?.id || ''}
                  avatarUrl={profile?.avatar_url}
                  initials={initials}
                  onAvatarUpdate={updateAvatarUrl}
                  size="sm"
                />
              )}
            </div>
            {(forMobile || !collapsed) && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
              </div>
            )}
            {(forMobile || !collapsed) && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/80 h-8 w-8"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
            {!forMobile && collapsed && (
              <div className="flex flex-col items-center gap-1">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/80 h-8 w-8"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Sign out
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );

  // Mobile: render as floating glass panel
  if (isMobile) {
    return (
      <>
        {/* Backdrop blur overlay */}
        <div
          className={cn(
            "fixed inset-0 z-50 transition-all duration-300 ease-out",
            mobileOpen
              ? "bg-black/30 backdrop-blur-md opacity-100 pointer-events-auto"
              : "bg-transparent backdrop-blur-none opacity-0 pointer-events-none"
          )}
          onClick={() => onMobileOpenChange?.(false)}
        />
        {/* Floating glass sidebar */}
        <div
          className={cn(
            "fixed z-50 top-4 bottom-4 left-4 w-[calc(50vw-8px)] max-w-[280px] min-w-[220px]",
            "rounded-2xl border border-white/20",
            "bg-sidebar/80 backdrop-blur-xl shadow-2xl shadow-black/20",
            "transition-all duration-300 ease-out overflow-y-auto scrollbar-hide",
            mobileOpen
              ? "translate-x-0 opacity-100 scale-100"
              : "-translate-x-[120%] opacity-0 scale-95"
          )}
        >
          <div onClick={() => onMobileOpenChange?.(false)}>
            {sidebarContent(true)}
          </div>
        </div>
      </>
    );
  }

  // Desktop: render inline
  return sidebarContent(false);
};

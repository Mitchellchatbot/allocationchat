import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { InfoIndicator } from '@/components/docs/InfoIndicator';
import { useSearchParams } from 'react-router-dom';
import { Compass, Menu, MoreVertical } from 'lucide-react';
import { deepDiveStepsMap } from './DashboardTour';
import { useDashboardLayout } from './DashboardLayout';
import { NotificationsBell } from './NotificationsBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
  docsLink?: string;
  /** Property selector element rendered inline on mobile */
  propertySelector?: React.ReactNode;
  /** Section key for deep dive tour (e.g., 'ai-support', 'widget', 'salesforce') */
  tourSection?: string;
}

export const PageHeader = ({ title, children, className, docsLink, propertySelector, tourSection }: PageHeaderProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openSidebar, isMobile } = useDashboardLayout();
  
  const hasDeepDive = tourSection && deepDiveStepsMap[tourSection]?.length > 0;

  const startDeepDive = () => {
    if (!tourSection) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tour', '1');
    newParams.set('tourMode', 'deep');
    newParams.set('deepSection', tourSection);
    setSearchParams(newParams, { replace: true });
  };

  const hasChildren = !!children;

  // Build overflow menu items for mobile (docs link, tour, action buttons)
  const mobileOverflowItems: React.ReactNode[] = [];
  if (docsLink) {
    mobileOverflowItems.push(
      <a key="docs" href={docsLink} className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
        <InfoIndicator to={docsLink} size="md" variant="header" />
        <span>Documentation</span>
      </a>
    );
  }
  if (hasDeepDive) {
    mobileOverflowItems.push(
      <button
        key="tour"
        onClick={startDeepDive}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors w-full text-left"
      >
        <Compass className="h-4 w-4" />
        <span>Tour this page</span>
      </button>
    );
  }

  return (
    <div 
      className={cn(
        "h-12 md:h-16 shrink-0 flex items-center justify-between px-3 md:px-6",
        "bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-shrink-1">
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/60 hover:bg-sidebar-accent flex-shrink-0" onClick={openSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-sm md:text-xl font-semibold text-sidebar-foreground truncate">{title}</h1>
        
        {/* Desktop-only: info + tour */}
        {docsLink && (
          <span data-tour="info-indicator" className="hidden md:inline flex-shrink-0">
            <InfoIndicator to={docsLink} size="md" variant="header" />
          </span>
        )}
        {hasDeepDive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={startDeepDive}
            className="hidden md:inline-flex h-7 gap-1.5 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-full px-2.5 flex-shrink-0"
            title="Take a detailed tour of this page"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Tour this page</span>
          </Button>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
        {/* Notifications bell */}
        <NotificationsBell variant="header" />
        
        {/* Property selector - inline on all sizes */}
        {propertySelector}
        
        {/* Desktop: children inline */}
        {children && (
          <div className="hidden md:flex items-center gap-1.5">
            {children}
          </div>
        )}

        {/* Mobile: overflow menu for children + extras */}
        {isMobile && (hasChildren || mobileOverflowItems.length > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/60 hover:bg-sidebar-accent">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px] p-1.5 space-y-0.5 bg-popover">
              {hasChildren && (
                <div className="flex items-center gap-1 px-1 py-1 justify-end">
                  {children}
                </div>
              )}
              {mobileOverflowItems.length > 0 && hasChildren && (
                <div className="h-px bg-border my-1" />
              )}
              {mobileOverflowItems}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

// Primary action button styled for dark header
export const HeaderButton = ({ 
  children, 
  variant = 'default',
  ...props 
}: React.ComponentProps<typeof Button> & { variant?: 'default' | 'outline' | 'ghost' }) => {
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border-sidebar-foreground/20 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground bg-transparent',
    ghost: 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent',
  };

  return (
    <Button 
      {...props}
      className={cn(variantClasses[variant], props.className)}
    >
      {children}
    </Button>
  );
};

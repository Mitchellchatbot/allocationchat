import { ChevronsUpDown, Check, Building2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useWorkspace, Workspace } from '@/hooks/useWorkspace';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface WorkspaceSwitcherProps {
  collapsed: boolean;
}

export const WorkspaceSwitcher = ({ collapsed }: WorkspaceSwitcherProps) => {
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();

  // Don't show if only one workspace
  if (workspaces.length <= 1) return null;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const WorkspaceItem = ({ workspace, isActive }: { workspace: Workspace; isActive: boolean }) => (
    <DropdownMenuItem
      className="flex items-center gap-3 cursor-pointer py-2.5 px-3"
      onSelect={() => {
        switchWorkspace(workspace.id);
        // Navigate to dashboard when switching workspaces
        navigate('/dashboard');
      }}
    >
      <Avatar className="h-7 w-7 shrink-0">
        {workspace.avatarUrl && <AvatarImage src={workspace.avatarUrl} />}
        <AvatarFallback className={cn(
          "text-[10px] font-bold",
          workspace.type === 'owner'
            ? "bg-primary/15 text-primary"
            : "bg-orange-500/15 text-orange-600"
        )}>
          {getInitials(workspace.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{workspace.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {workspace.type === 'owner' ? 'Admin' : 'Agent'}
        </p>
      </div>
      {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
    </DropdownMenuItem>
  );

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
            <Avatar className="h-7 w-7">
              {activeWorkspace?.avatarUrl && <AvatarImage src={activeWorkspace.avatarUrl} />}
              <AvatarFallback className={cn(
                "text-[10px] font-bold",
                activeWorkspace?.type === 'owner'
                  ? "bg-primary/15 text-primary"
                  : "bg-orange-500/15 text-orange-600"
              )}>
                {activeWorkspace ? getInitials(activeWorkspace.name) : '?'}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-[240px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
          {workspaces.map(w => (
            <WorkspaceItem key={w.id} workspace={w} isActive={w.id === activeWorkspace?.id} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "flex items-center gap-2.5 w-full p-2.5 rounded-xl",
          "hover:bg-sidebar-accent transition-all duration-200",
          "text-left group"
        )}>
          <Avatar className="h-8 w-8 shrink-0">
            {activeWorkspace?.avatarUrl && <AvatarImage src={activeWorkspace.avatarUrl} />}
            <AvatarFallback className={cn(
              "text-xs font-bold",
              activeWorkspace?.type === 'owner'
                ? "bg-primary/15 text-primary"
                : "bg-orange-500/15 text-orange-600"
            )}>
              {activeWorkspace ? getInitials(activeWorkspace.name) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">
              {activeWorkspace?.name}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50">
              {activeWorkspace?.type === 'owner' ? 'Admin Panel' : 'Agent Inbox'}
            </p>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70 shrink-0 transition-colors" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-[260px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
          Switch Workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Owner workspaces */}
        {workspaces.filter(w => w.type === 'owner').map(w => (
          <WorkspaceItem key={w.id} workspace={w} isActive={w.id === activeWorkspace?.id} />
        ))}
        
        {/* Agent workspaces */}
        {workspaces.some(w => w.type === 'agent') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] text-muted-foreground font-medium">
              Agent Access
            </DropdownMenuLabel>
            {workspaces.filter(w => w.type === 'agent').map(w => (
              <WorkspaceItem key={w.id} workspace={w} isActive={w.id === activeWorkspace?.id} />
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

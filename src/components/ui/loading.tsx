import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

// Animated spinner with primary color
export const Spinner = ({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };
  
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-primary/20 border-t-primary",
        sizeClasses[size],
        className
      )}
    />
  );
};

// Pulsing dots loader
export const DotsLoader = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-1", className)}>
    <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
    <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
  </div>
);

// Shimmer effect skeleton
export const ShimmerSkeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-md bg-muted",
      "before:absolute before:inset-0 before:-translate-x-full",
      "before:animate-[shimmer_1.5s_infinite]",
      "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
      className
    )}
  />
);

// Full page loading overlay
export const PageLoader = ({ message = "Loading..." }: { message?: string }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
        <Spinner size="lg" className="absolute inset-0 m-auto" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  </div>
);

// Inline content loader with fade transition
export const ContentLoader = ({ 
  className, 
  message = "Loading..." 
}: { 
  className?: string;
  message?: string;
}) => (
  <div className={cn(
    "flex flex-col items-center justify-center gap-3 py-12 animate-in fade-in duration-300",
    className
  )}>
    <Spinner size="md" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

// Conversation list skeleton
export const ConversationListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-1 p-2 animate-in fade-in duration-300">
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className="flex gap-3 p-4 rounded-lg"
        style={{ animationDelay: `${i * 50}ms` }}
      >
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

// Chat messages skeleton
export const ChatSkeleton = () => (
  <div className="flex-1 p-4 space-y-4 animate-in fade-in duration-300">
    {/* Visitor message */}
    <div className="flex gap-2">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <Skeleton className="h-16 w-48 rounded-2xl rounded-bl-lg" />
    </div>
    {/* Agent message */}
    <div className="flex gap-2 flex-row-reverse">
      <Skeleton className="h-12 w-56 rounded-2xl rounded-br-lg" />
    </div>
    {/* Visitor message */}
    <div className="flex gap-2">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <Skeleton className="h-20 w-64 rounded-2xl rounded-bl-lg" />
    </div>
  </div>
);

// Dashboard stats skeleton
export const StatsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className="p-4 rounded-xl border border-border/50 space-y-2"
        style={{ animationDelay: `${i * 75}ms` }}
      >
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-24" />
      </div>
    ))}
  </div>
);

// Table skeleton
export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="border rounded-lg overflow-hidden animate-in fade-in duration-300">
    {/* Header */}
    <div className="bg-muted/50 p-4 flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div 
        key={rowIndex} 
        className="p-4 flex gap-4 border-t border-border/50"
        style={{ animationDelay: `${rowIndex * 50}ms` }}
      >
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// Card skeleton
export const CardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn(
    "p-6 rounded-xl border border-border/50 space-y-4 animate-in fade-in duration-300",
    className
  )}>
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <Skeleton className="h-20 w-full" />
    <div className="flex gap-2">
      <Skeleton className="h-8 w-20 rounded-md" />
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
  </div>
);

// Sidebar skeleton
export const SidebarSkeleton = () => (
  <div className="w-64 h-full bg-sidebar p-4 space-y-6 animate-in slide-in-from-left duration-300">
    {/* Logo */}
    <Skeleton className="h-8 w-32" />
    
    {/* Nav items */}
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
    
    {/* User section */}
    <div className="absolute bottom-4 left-4 right-4">
      <div className="flex items-center gap-3 p-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2 w-16" />
        </div>
      </div>
    </div>
  </div>
);

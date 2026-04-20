import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoIndicatorProps {
  to: string;
  className?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'header';
}

export const InfoIndicator = ({ to, className, size = 'sm', variant = 'default' }: InfoIndicatorProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5'
  };

  const variantClasses = {
    default: 'text-muted-foreground/50 hover:text-primary hover:bg-primary/10',
    header: 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10'
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={to}
          className={cn(
            'inline-flex items-center justify-center rounded-full',
            variantClasses[variant],
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary/20',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Info className={sizeClasses[size]} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Learn more
      </TooltipContent>
    </Tooltip>
  );
};

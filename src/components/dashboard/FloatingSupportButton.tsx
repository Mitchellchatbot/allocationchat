import { useState } from 'react';
import { HelpCircle, Calendar, MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export const FloatingSupportButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden md:flex flex-col items-end gap-2">
      {/* Menu options */}
      {isOpen && (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <button
            onClick={() => {
              navigate('/dashboard/support');
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-lg",
              "hover:bg-accent hover:shadow-xl transition-all duration-200",
              "text-sm font-medium text-foreground whitespace-nowrap"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            Need Help?
          </button>
          <a
            href="https://calendly.com/care-assist-support/support-call-clone"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-lg",
              "hover:bg-accent hover:shadow-xl transition-all duration-200",
              "text-sm font-medium text-foreground whitespace-nowrap no-underline"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            Book Support Call
          </a>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center",
          "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
          "transition-all duration-300 hover:scale-105 active:scale-95"
        )}
      >
        {isOpen ? (
          <X className="h-5 w-5 transition-transform duration-200" />
        ) : (
          <HelpCircle className="h-5 w-5 transition-transform duration-200" />
        )}
      </button>
    </div>
  );
};

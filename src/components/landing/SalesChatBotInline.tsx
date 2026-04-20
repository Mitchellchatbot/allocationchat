import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import careAssistLogo from '@/assets/scaled-bot-logo.svg';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const SalesChatBotInline = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showFirstMessage, setShowFirstMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showFirstMessage]);

  // Show typing then first message after 5s
  useEffect(() => {
    const typingTimer = setTimeout(() => setIsTyping(true), 500);
    const msgTimer = setTimeout(() => {
      setIsTyping(false);
      setShowFirstMessage(true);
    }, 5000);
    return () => {
      clearTimeout(typingTimer);
      clearTimeout(msgTimer);
    };
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setIsTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('sales-chat', {
        body: { messages: updated.map(m => ({ role: m.role, content: m.content })) },
      });
      if (error) throw error;
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data?.reply || "Sorry, I couldn't process that. Try again!",
      }]);
    } catch (err) {
      console.error('Sales chat error:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Oops, something went wrong. Please try again!",
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col bg-card" style={{ height: '420px' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-white/20 to-transparent" />
        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden relative z-10">
          <img src={careAssistLogo} alt="Care Assist" className="h-8 w-8 object-contain" />
        </div>
        <div className="relative z-10">
          <h3 className="font-semibold text-primary-foreground">Care Assist</h3>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-primary-foreground/80">Ask me anything</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-background to-muted/20">
        {showFirstMessage && (
          <div className="flex gap-3 animate-fade-in">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <img src={careAssistLogo} alt="" className="h-6 w-6 object-contain" />
            </div>
            <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
              <p className="text-sm text-foreground">
                👋 Hey! Got questions about Care Assist? Ask me anything about features, pricing, or how it works!
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : '')}>
            {msg.role === 'assistant' && (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <img src={careAssistLogo} alt="" className="h-6 w-6 object-contain" />
              </div>
            )}
            <div className={cn(
              'px-4 py-3 max-w-[80%] text-sm',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
                : 'bg-muted/50 text-foreground rounded-2xl rounded-tl-sm'
            )}>
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <img src={careAssistLogo} alt="" className="h-6 w-6 object-contain" />
            </div>
            <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/50 bg-card/50">
        <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2 border border-border/40 focus-within:border-primary/30 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Care Assist..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all shrink-0"
          >
            <Send className="h-4 w-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

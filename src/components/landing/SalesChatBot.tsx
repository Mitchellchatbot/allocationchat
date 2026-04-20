import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import careAssistLogo from '@/assets/scaled-bot-logo.svg';
import agentAvatar from '@/assets/personas/blonde-agent.jpg';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const SalesChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [jiggling, setJiggling] = useState(false);
  const [showFirstMessage, setShowFirstMessage] = useState(false);
  const [showSecondMessage, setShowSecondMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Jiggle then auto-open after delay
  useEffect(() => {
    const jiggleTimer = setTimeout(() => setJiggling(true), 1500);
    const openTimer = setTimeout(() => {
      setJiggling(false);
      setIsOpen(true);
    }, 4500);
    return () => {
      clearTimeout(jiggleTimer);
      clearTimeout(openTimer);
    };
  }, []);

  // After chat opens, show typing then first message after 5s, then second message
  useEffect(() => {
    if (isOpen && !showFirstMessage && messages.length === 0) {
      // Show typing immediately when chat opens
      const typingTimer = setTimeout(() => setIsTyping(true), 500);
      const firstMsgTimer = setTimeout(() => {
        setIsTyping(false);
        setShowFirstMessage(true);
      }, 5000); // 5s delay for first message
      return () => {
        clearTimeout(typingTimer);
        clearTimeout(firstMsgTimer);
      };
    }
  }, [isOpen, showFirstMessage, messages.length]);

  // After first message, show typing then second message
  useEffect(() => {
    if (showFirstMessage && !showSecondMessage && messages.length === 0) {
      const typingTimer = setTimeout(() => setIsTyping(true), 1500);
      const msgTimer = setTimeout(() => {
        setIsTyping(false);
        setShowSecondMessage(true);
      }, 4500);
      return () => {
        clearTimeout(typingTimer);
        clearTimeout(msgTimer);
      };
    }
  }, [showFirstMessage, showSecondMessage, messages.length]);

  const handleClose = () => {
    setIsClosing(true);
  };

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
        body: {
          messages: updated.map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const reply = data?.reply || "Sorry, I couldn't process that. Try again!";
      
      // If the AI mentions the booking link, auto-navigate after a short delay
      if (reply.includes('/book-demo') || reply.toLowerCase().includes('book a demo') || reply.toLowerCase().includes('pick a time')) {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply.replace(/https?:\/\/[^\s]+\/book-demo/g, '').trim(),
        };
        setMessages(prev => [...prev, botMsg]);
        setTimeout(() => navigate('/book-demo'), 2000);
      } else {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply,
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } catch (err) {
      console.error('Sales chat error:', err);
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: "Oops, something went wrong. Please try again!" },
      ]);
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
    <div className="fixed bottom-4 right-0 z-50 font-sans flex flex-col items-end pr-4">
      {/* Chat Panel */}
      {(isOpen || isClosing) && (
        <div
          className={cn(
            'mb-3 bg-card/95 backdrop-blur-lg rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border/50',
            isClosing ? 'animate-scale-out' : 'animate-scale-in'
          )}
          onAnimationEnd={() => {
            if (isClosing) {
              setIsClosing(false);
              setIsOpen(false);
            }
          }}
          style={{ width: 'min(260px, calc(100vw - 32px))', height: 'min(320px, calc(100vh - 120px))' }}
        >
          {/* Header */}
          <div className="px-3 py-2 flex items-center justify-between bg-primary relative overflow-hidden">
            <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-white/20 to-transparent" />
            <div className="flex items-center gap-2 relative z-10">
              <div className="h-7 w-7 rounded-full overflow-hidden border-2 border-white/30">
                <img src={agentAvatar} alt="Care Assist" className="h-full w-full object-cover" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground text-[11px]">Care Assist</h3>
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[9px] text-primary-foreground/80">Online now</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors relative z-10"
            >
              <X className="h-3 w-3 text-primary-foreground" />
            </button>
          </div>
          {/* HIPAA badge */}
          <div className="flex items-center justify-center gap-1 px-2 py-1 bg-green-50 border-b border-green-200/60">
            <Shield className="w-2.5 h-2.5 text-green-600" />
            <span className="text-[8px] font-semibold text-green-600">100% HIPAA Compliant & Confidential</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-gradient-to-b from-background to-muted/20">
            {showFirstMessage && (
              <div className="flex gap-2 animate-fade-in">
                <div className="h-6 w-6 rounded-full overflow-hidden shrink-0">
                  <img src={agentAvatar} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-2.5 py-2 max-w-[85%]">
                  <p className="text-[12px] text-foreground">
                    Hey! I'm Emily from Care-Assist. Want to see how centers capture 35% more leads? 😊
                  </p>
                </div>
              </div>
            )}

            {/* Second message after typing */}
            {showSecondMessage && messages.length === 0 && (
              <div className="flex gap-2 animate-fade-in">
                <div className="h-6 w-6 rounded-full overflow-hidden shrink-0">
                  <img src={agentAvatar} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-2.5 py-2 max-w-[85%]">
                  <p className="text-[12px] text-foreground">
                    I can show you in a quick demo. Our clients capture 4 additional VOBs per month on average 🧡😊
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : '')}>
                {msg.role === 'assistant' && (
                  <div className="h-6 w-6 rounded-full overflow-hidden shrink-0">
                    <img src={agentAvatar} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <div
                  className={cn(
                    'px-2.5 py-2 max-w-[80%] text-[12px]',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
                      : 'bg-muted/50 text-foreground rounded-2xl rounded-tl-sm'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-full overflow-hidden shrink-0">
                  <img src={agentAvatar} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-3 py-2.5">
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
          <div className="p-2.5 border-t border-border/50 bg-card/50">
            <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2 border border-border/40 focus-within:border-primary/30 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Care Assist..."
                className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all shrink-0"
              >
                <Send className="h-3.5 w-3.5 text-primary-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB Button */}
      {!isOpen && !isClosing && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'h-14 w-14 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 group',
            jiggling && 'animate-[gentlePulse_2s_ease-in-out_infinite]'
          )}
        >
          <MessageCircle className="h-6 w-6 text-primary-foreground group-hover:scale-110 transition-transform" />
        </button>
      )}
    </div>
  );
};

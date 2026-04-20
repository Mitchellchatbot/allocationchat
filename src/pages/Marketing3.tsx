import { useState, useEffect, useRef, useCallback } from 'react';
import careAssistLogo from '@/assets/scaled-bot-logo.svg';

/* ── Chat script — realistic intake conversation ── */
const SCRIPT: { sender: 'agent' | 'visitor'; text: string; delay: number }[] = [
  { sender: 'agent', text: "Hi there! 👋 I'm so glad you reached out. Can I get your first name?", delay: 1200 },
  { sender: 'visitor', text: "Hi, my name is Sarah", delay: 2800 },
  { sender: 'agent', text: "Nice to meet you, Sarah! Are you looking into treatment for yourself or a loved one?", delay: 2400 },
  { sender: 'visitor', text: "It's for my brother actually, he's been struggling with alcohol", delay: 3200 },
  { sender: 'agent', text: "I'm sorry to hear that. We help families like yours every day. Do you know if he has insurance?", delay: 2800 },
  { sender: 'visitor', text: "Yes he has Blue Cross Blue Shield", delay: 2600 },
  { sender: 'agent', text: "Great — BCBS is one of the most common plans we work with. What's the best phone number to reach you?", delay: 2400 },
  { sender: 'visitor', text: "(555) 234-8901", delay: 2200 },
  { sender: 'agent', text: "Perfect, Sarah. One of our care coordinators will call you shortly. You're in good hands. 💚", delay: 2000 },
];

interface ChatMsg {
  id: number;
  sender: 'agent' | 'visitor';
  text: string;
}

/* ── Typing dots component ── */
const TypingIndicator = ({ isAgent }: { isAgent: boolean }) => (
  <div className={`flex items-end gap-2 ${isAgent ? '' : 'justify-end'}`}>
    {isAgent && (
      <div className="w-7 h-7 rounded-full bg-[hsl(24,95%,53%)] flex items-center justify-center shrink-0">
        <img src={careAssistLogo} alt="" className="w-5 h-5 object-contain brightness-0 invert" />
      </div>
    )}
    <div className={`px-4 py-3 rounded-2xl ${isAgent ? 'bg-[hsl(220,14%,96%)] rounded-tl-sm' : 'bg-[hsl(24,95%,53%)] rounded-tr-sm'}`}>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className={`block w-2 h-2 rounded-full ${isAgent ? 'bg-[hsl(0,0%,55%)]' : 'bg-white/70'}`}
            style={{
              animation: 'iphone-dot-bounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

/* ── Single chat bubble ── */
const ChatBubble = ({ msg }: { msg: ChatMsg }) => {
  const isAgent = msg.sender === 'agent';
  return (
    <div className={`flex items-end gap-2 animate-[iphone-msg-in_0.35s_ease-out_both] ${isAgent ? '' : 'justify-end'}`}>
      {isAgent && (
        <div className="w-7 h-7 rounded-full bg-[hsl(24,95%,53%)] flex items-center justify-center shrink-0">
          <img src={careAssistLogo} alt="" className="w-5 h-5 object-contain brightness-0 invert" />
        </div>
      )}
      <div
        className={`max-w-[78%] px-3.5 py-2.5 text-[13px] leading-[1.45] ${
          isAgent
            ? 'bg-[hsl(220,14%,96%)] text-[hsl(0,0%,8%)] rounded-2xl rounded-tl-sm'
            : 'bg-[hsl(24,95%,53%)] text-white rounded-2xl rounded-tr-sm'
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
};

/* ── Main page ── */
const Marketing3 = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState<'agent' | 'visitor' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
  }, []);

  const runScript = useCallback(() => {
    clearTimers();
    setMessages([]);
    setTyping(null);

    let elapsed = 500; // initial pause

    SCRIPT.forEach((line, i) => {
      const typingStart = elapsed;
      const typingDuration = Math.min(line.delay * 0.5, 1600);
      const msgAppear = typingStart + typingDuration;

      // Show typing
      timeoutRef.current.push(
        setTimeout(() => setTyping(line.sender), typingStart)
      );

      // Show message, hide typing
      timeoutRef.current.push(
        setTimeout(() => {
          setTyping(null);
          setMessages(prev => [...prev, { id: i, sender: line.sender, text: line.text }]);
        }, msgAppear)
      );

      elapsed = msgAppear + 600; // gap between messages
    });

    // Restart loop after last message
    timeoutRef.current.push(
      setTimeout(() => runScript(), elapsed + 3500)
    );
  }, [clearTimers]);

  useEffect(() => {
    runScript();
    return clearTimers;
  }, [runScript, clearTimers]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(24,40%,12%)] via-[hsl(24,30%,16%)] to-[hsl(220,20%,14%)] p-4 overflow-hidden relative">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(24,95%,53%)]/10 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[hsl(24,95%,53%)]/5 blur-[120px]" />

      {/* ── iPhone 15 Pro Mockup ── */}
      <div className="relative" style={{ width: 320, height: 660 }}>
        {/* Outer bezel — titanium frame */}
        <div
          className="absolute inset-0 rounded-[52px] shadow-2xl"
          style={{
            background: 'linear-gradient(145deg, hsl(220 5% 45%), hsl(220 5% 30%), hsl(220 5% 40%))',
            boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08) inset',
          }}
        />

        {/* Inner screen area */}
        <div className="absolute inset-[3px] rounded-[49px] bg-black overflow-hidden">
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
            <div className="w-[100px] h-[28px] bg-black rounded-full" />
          </div>

          {/* Status bar */}
          <div className="absolute top-0 inset-x-0 z-20 h-12 flex items-end justify-between px-8 pb-0.5">
            <span className="text-white/80 text-[11px] font-semibold">9:41</span>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-3 text-white/80" viewBox="0 0 18 12" fill="currentColor">
                <path d="M1 4h2v8H1zM5 3h2v9H5zM9 1.5h2v10.5H9zM13 0h2v12h-2z" />
              </svg>
              <svg className="w-6 h-3 text-white/80" viewBox="0 0 27 12" fill="currentColor">
                <rect x="0" y="1" width="22" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <rect x="1.5" y="2.5" width="17" height="7" rx="1" fill="currentColor" />
                <path d="M23 4.5h1.5c.6 0 1 .4 1 1v1c0 .6-.4 1-1 1H23z" />
              </svg>
            </div>
          </div>

          {/* ── Chat UI ── */}
          <div className="absolute inset-0 flex flex-col bg-white pt-12">
            {/* Chat header */}
            <div className="bg-[hsl(24,95%,53%)] px-4 py-3 flex items-center gap-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center relative z-10">
                <img src={careAssistLogo} alt="Care Assist" className="w-7 h-7 object-contain brightness-0 invert" />
              </div>
              <div className="relative z-10">
                <p className="text-white font-semibold text-sm">Care Assist</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[11px] text-white/80">Here to help</span>
                </div>
              </div>
            </div>

            {/* Confidentiality banner */}
            <div className="px-4 py-2.5 text-center border-b border-[hsl(220,13%,91%)]">
              <p className="text-[11px] text-[hsl(0,0%,35%)]">🔒 100% Private & Confidential. Take your time. 💚</p>
            </div>

            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollBehavior: 'smooth' }}>
              {messages.map((msg) => (
                <ChatBubble key={msg.id} msg={msg} />
              ))}
              {typing && <TypingIndicator isAgent={typing === 'agent'} />}
            </div>

            {/* Input bar */}
            <div className="px-3 py-3 border-t border-[hsl(220,13%,91%)] bg-white">
              <div className="flex items-center gap-2 bg-[hsl(220,14%,96%)] rounded-xl px-3 py-2.5">
                <span className="text-[13px] text-[hsl(0,0%,55%)] flex-1">Type a message…</span>
                <div className="w-7 h-7 rounded-lg bg-[hsl(24,95%,53%)] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Home indicator */}
            <div className="flex justify-center pb-2 pt-1 bg-white">
              <div className="w-28 h-1 rounded-full bg-black/20" />
            </div>
          </div>
        </div>

        {/* Side buttons — volume */}
        <div className="absolute -left-[2px] top-[140px] w-[3px] h-[28px] rounded-l bg-[hsl(220,5%,38%)]" />
        <div className="absolute -left-[2px] top-[185px] w-[3px] h-[50px] rounded-l bg-[hsl(220,5%,38%)]" />
        <div className="absolute -left-[2px] top-[245px] w-[3px] h-[50px] rounded-l bg-[hsl(220,5%,38%)]" />
        {/* Power */}
        <div className="absolute -right-[2px] top-[200px] w-[3px] h-[70px] rounded-r bg-[hsl(220,5%,38%)]" />
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes iphone-dot-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        @keyframes iphone-msg-in {
          0% { opacity: 0; transform: translateY(8px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Marketing3;

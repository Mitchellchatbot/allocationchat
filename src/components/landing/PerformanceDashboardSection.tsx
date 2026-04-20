import { Shield } from "lucide-react";

const pills = [
  "HIPAA compliant",
  "35% more leads",
  "Google Ads optimized",
  "Live in 5 min",
];

const bigStats = [
  { value: "35%", label: "More leads" },
  { value: "27%", label: "Faster Google Ads" },
  { value: "<4s", label: "Response time" },
];

const metrics = [
  { label: "Leads", value: "+35%", change: "↑ This month", changeColor: "text-green-500" },
  { label: "Google Ads", value: "27%", change: "↑ Faster", changeColor: "text-primary" },
  { label: "Cost/Lead", value: "$42", change: "↓ 47%", changeColor: "text-green-500" },
];

const miniStats = [
  { value: "3x", label: "More leads" },
  { value: "24/7", label: "Always on" },
  { value: "<4s", label: "Response" },
];

const PerformanceDashboardSection = () => (
  <section className="px-4 py-16 md:py-24 bg-[#FAF8F6]">
    <style>{`
      @keyframes typingBounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-6px); }
      }
    `}</style>

    <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-start">
      {/* ── LEFT COLUMN ── */}
      <div className="reveal opacity-0 translate-y-6 transition-all duration-700">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-4">Care-Assist AI Chat</p>

        <h2 className="text-3xl md:text-[2.75rem] font-black leading-[1.1] tracking-tight mb-6">
          HIPAA Compliant.
          <br />
          35% More Leads.
          <br />
          <span className="text-primary">27% Faster</span>.
        </h2>


        {/* Pill badges */}
        <div className="grid grid-cols-2 gap-2.5 mb-8 max-w-md">
          {pills.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground"
            >
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              {p}
            </span>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border/60 mb-8 max-w-md" />

        {/* Big stats row */}
        <div className="flex items-start gap-6 max-w-md">
          {bigStats.map((s, i) => (
            <div key={s.label} className="flex items-start gap-6">
              <div className="text-center flex-1">
                <p className="text-3xl md:text-4xl font-black text-primary leading-none mb-1">{s.value}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">{s.label}</p>
              </div>
              {i < bigStats.length - 1 && <div className="w-px h-14 bg-border/60 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT COLUMN — Light Card ── */}
      <div className="reveal opacity-0 translate-y-6 transition-all duration-700" style={{ transitionDelay: "0.15s" }}>
        <div className="rounded-3xl overflow-hidden bg-card border border-border/60 shadow-xl shadow-primary/5">
          {/* Label */}
          <div className="px-5 pt-5 pb-3">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary">Performance Statistics</p>
          </div>

          {/* Chat preview */}
          <div className="mx-4 rounded-xl overflow-hidden border border-border">
            {/* Chat header */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-primary">
              <div className="w-7 h-7 rounded-full bg-primary-foreground/20 flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                CA
              </div>
              <div>
                <p className="text-xs font-bold text-primary-foreground leading-tight">Care Assist</p>
                <p className="text-[10px] text-primary-foreground/70 leading-tight">Here to help</p>
              </div>
            </div>

            {/* Chat body */}
            <div className="p-3 space-y-2.5 bg-muted/40">
              {/* Bot message */}
              <div className="max-w-[85%]">
                <div className="rounded-xl rounded-tl-sm px-3 py-2 text-xs text-foreground bg-background border border-border/60">
                  Are you looking for help for yourself or a loved one?
                </div>
              </div>
              {/* User message */}
              <div className="max-w-[75%] ml-auto">
                <div className="rounded-xl rounded-tr-sm px-3 py-2 text-xs text-primary-foreground font-medium bg-primary">
                  My son. He needs treatment.
                </div>
              </div>
              {/* Typing indicator */}
              <div className="max-w-[85%]">
                <div className="inline-flex gap-1 items-center rounded-xl rounded-tl-sm px-3.5 py-2.5 bg-background border border-border/60">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary"
                      style={{
                        animation: "typingBounce 1.2s ease-in-out infinite",
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="mx-4 mt-4 rounded-xl border border-border divide-y divide-border overflow-hidden">
            {metrics.map((m) => (
              <div key={m.label} className="flex items-center justify-between px-4 py-2.5 bg-background">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{m.value}</span>
                  <span className={`text-[10px] font-semibold ${m.changeColor}`}>{m.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Mini stat cards */}
          <div className="grid grid-cols-3 gap-2 mx-4 mt-3">
            {miniStats.map((s) => (
              <div key={s.label} className="rounded-lg px-3 py-2.5 text-center bg-muted/50 border border-border/40">
                <p className="text-lg font-black text-primary leading-none mb-0.5">{s.value}</p>
                <p className="text-[9px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* HIPAA strip */}
          <div className="mx-4 mt-3 mb-4 rounded-lg flex items-center justify-center gap-2 px-3 py-2 bg-green-50 border border-green-200/60">
            <Shield className="w-3.5 h-3.5 text-green-600" />
            <p className="text-[10px] font-semibold text-green-600 tracking-wide">
              HIPAA-Compliant · Encrypted · Audit Logs
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default PerformanceDashboardSection;

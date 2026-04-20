import { useEffect, useState } from "react";

const stats = [
  { value: "3x", prefix: "Up to", description: "more captured leads" },
  { value: "47%", prefix: "Up to", description: "lower cost per lead" },
  { value: "35%", prefix: "Up to", description: "lift in qualified inquiries" },
];

const Marketing = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Floating orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] animate-float" />
        <div
          className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-accent/15 blur-[140px] animate-float"
          style={{ animationDelay: "4s" }}
        />
        <div
          className="absolute top-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px] animate-float"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.08) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
      />

      {/* Mouse-follow glow */}
      <div
        className="pointer-events-none fixed hidden md:block rounded-full"
        style={{
          width: 600,
          height: 600,
          left: mousePos.x - 300,
          top: mousePos.y - 300,
          background: "radial-gradient(circle, hsl(var(--primary) / 0.06) 0%, transparent 70%)",
          filter: "blur(40px)",
          transition: "left 0.3s ease-out, top 0.3s ease-out",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-10 max-w-5xl px-6 md:px-12 py-20">
        {/* Logo */}
        <img src="/favicon.png" alt="Care Assist" className="h-16 md:h-20 animate-fade-in" />

        {/* Intro */}
        <p className="text-lg md:text-xl text-muted-foreground text-center animate-fade-in" style={{ animationDelay: "0.15s" }}>
          On average, centers using Care-Assist see:
        </p>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full stagger-children">
          {stats.map((stat) => (
            <div
              key={stat.value}
              className="glass rounded-2xl p-8 flex flex-col items-center text-center gap-2 card-interactive"
            >
              <span className="text-sm font-medium text-muted-foreground">{stat.prefix}</span>
              <span className="text-5xl md:text-6xl font-bold text-primary tracking-tight">{stat.value}</span>
              <span className="text-base text-foreground/80">{stat.description}</span>
            </div>
          ))}
        </div>

        {/* Closing lines */}
        <div className="flex flex-col items-center gap-2 mt-4 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <p className="text-xl md:text-2xl text-muted-foreground text-center">
            Not because they bought more traffic.
          </p>
          <p className="text-2xl md:text-3xl font-bold text-foreground text-center">
            Because they stopped leaking it.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Marketing;

import { useEffect, useState } from "react";

const points = [
  { highlight: "Free 7-day trial.", detail: "No commitment." },
  { highlight: "One-on-one onboarding session —", detail: "Where we align everything with your intake process." },
  { highlight: "Setup takes five minutes.", detail: "One line of code." },
  { highlight: "Works on any website.", detail: null },
];

const Marketing2 = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative h-screen flex items-center overflow-hidden bg-background">
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
        {/* Extra orb bottom-left */}
        <div
          className="absolute bottom-1/4 left-1/6 h-[250px] w-[250px] rounded-full bg-primary/8 blur-[90px] animate-float"
          style={{ animationDelay: "3s" }}
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


      {/* Content — left-aligned */}
      <div className="relative z-10 flex flex-col gap-6 max-w-2xl pl-12 md:pl-20 lg:pl-28 pr-6">
        {/* Logo */}
        <img src="/favicon.png" alt="Care Assist" className="h-12 md:h-16 self-start animate-fade-in" />

        {/* Offer points */}
        <div className="flex flex-col gap-4 w-full stagger-children">
          {points.map((point, i) => (
            <div
              key={i}
              className="glass rounded-xl px-6 py-4 md:px-8 md:py-5 flex flex-col gap-0.5 card-interactive text-left"
            >
              <span className="text-lg md:text-xl font-bold text-foreground">{point.highlight}</span>
              {point.detail && (
                <span className="text-sm md:text-base text-muted-foreground">{point.detail}</span>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Marketing2;

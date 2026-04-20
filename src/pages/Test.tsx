import { useEffect, useRef, useState } from "react";
import careAssistLogo from "@/assets/care-assist-logo.png";
import favicon from "/favicon.png";

const Test = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background"
    >
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

      {/* Mouse-follow glow (desktop) */}
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
      <div className="relative z-10 flex flex-col items-start gap-6 max-w-3xl px-6 md:px-12 animate-fade-in">
        <img src={favicon} alt="Care Assist" className="h-14 md:h-16" />
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
          What if you could increase qualified leads by <span className="text-primary">35%</span>?
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground">Without increasing ad spend or hiring more staff.</p>
      </div>
    </div>
  );
};

export default Test;

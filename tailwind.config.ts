import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tight: '-0.01em',
        normal: '0.01em',
        wide: '0.025em',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chat: {
          user: "hsl(var(--chat-bubble-user))",
          "user-foreground": "hsl(var(--chat-bubble-user-foreground))",
          visitor: "hsl(var(--chat-bubble-visitor))",
          "visitor-foreground": "hsl(var(--chat-bubble-visitor-foreground))",
        },
        status: {
          online: "hsl(var(--online))",
          offline: "hsl(var(--offline))",
          away: "hsl(var(--away))",
          pending: "hsl(var(--pending))",
        },
        healing: "hsl(var(--online))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 6px)",
        "2xl": "calc(var(--radius) + 12px)",
        "3xl": "2rem",
        "4xl": "2.5rem",
      },
      keyframes: {
        "jiggle": {
          "0%, 100%": { transform: "rotate(0deg) scale(1)" },
          "15%": { transform: "rotate(-5deg) scale(1.04)" },
          "30%": { transform: "rotate(4deg) scale(1.06)" },
          "45%": { transform: "rotate(-3deg) scale(1.04)" },
          "60%": { transform: "rotate(2deg) scale(1.02)" },
          "75%": { transform: "rotate(-1deg) scale(1.01)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95) translateY(16px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "breathe": {
          "0%, 100%": { opacity: "0.7", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        "typing-bounce": {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "30%": { transform: "translateY(-4px)", opacity: "1" },
        },
        "scale-out": {
          from: { opacity: "1", transform: "scale(1) translateY(0)" },
          to: { opacity: "0", transform: "scale(0.95) translateY(16px)" },
        },
        "attention-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "15%": { transform: "translateY(-5px)" },
          "30%": { transform: "translateY(0)" },
          "45%": { transform: "translateY(-2px)" },
          "60%": { transform: "translateY(0)" },
        },
        "float-in-left": {
          from: { opacity: "0", transform: "translateX(-60px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "float-in-right": {
          from: { opacity: "0", transform: "translateX(60px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "float-in-up": {
          from: { opacity: "0", transform: "translateY(40px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-up": "slide-up 0.3s ease-out",
        "breathe": "breathe 2.5s ease-in-out infinite",
        "typing-bounce": "typing-bounce 1.4s ease-in-out infinite",
        "scale-out": "scale-out 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "attention-bounce": "attention-bounce 0.8s ease-out",
        "float-in-left": "float-in-left 1.2s cubic-bezier(0.22, 1, 0.36, 1) both",
        "float-in-right": "float-in-right 1.2s cubic-bezier(0.22, 1, 0.36, 1) both",
        "float-in-up": "float-in-up 1.2s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

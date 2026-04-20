import careAssistLogo from "@/assets/care-assist-icon-transparent.png";

const Marketing4 = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-background">
      {/* Orange accent glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, hsl(24 95% 53% / 0.12) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(24 95% 53% / 0.15) 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(24 95% 53% / 0.10) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
        {/* Logo */}
        <img
          src={careAssistLogo}
          alt="Care Assist"
          className="h-24 md:h-32 mb-12 bg-transparent"
          style={{ backgroundColor: 'transparent', mixBlendMode: 'multiply' }}
        />

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-foreground">
          Providing care and connection 24/7,
          <br />
          <span className="text-primary">because no one should wait for help.</span>
        </h1>

        {/* CTA Button */}
        <a
          href="/get-started"
          className="mt-12 inline-flex items-center justify-center rounded-full px-10 py-4 text-lg font-bold transition-transform hover:scale-105 bg-primary text-primary-foreground"
        >
          Get Your Free Trial Today
        </a>
      </div>
    </div>
  );
};

export default Marketing4;

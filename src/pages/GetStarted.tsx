import { useEffect } from 'react';
import careAssistLogo from '@/assets/care-assist-logo.png';
import { Check, Star } from 'lucide-react';

const GetStarted = () => {
  useEffect(() => {
    // Load LeadConnector embed script
    const script = document.createElement('script');
    script.src = 'https://link.msgsndr.com/js/form_embed.js';
    script.type = 'text/javascript';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-border/50">
        <div className="max-w-5xl mx-auto flex items-center justify-center">
          <img src={careAssistLogo} alt="Care Assist" className="h-8" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10 md:py-16">
        <div className="max-w-2xl w-full text-center space-y-6">
          {/* Social proof */}
          <div className="inline-flex items-center gap-2 bg-muted/60 rounded-full px-4 py-1.5">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
              ))}
            </div>
            <span className="text-xs font-semibold text-foreground">Trusted by 100+ treatment centers</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Start For{' '}
            <span className="text-primary">Free</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
            Fill out the form below and we'll get your AI agent set up. Takes less than 60 seconds.
          </p>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Cancel anytime</span>
          </div>

          {/* Survey/Form Embed */}
          <div className="w-full mt-6 rounded-2xl overflow-hidden border border-border/50 shadow-lg bg-card p-4 md:p-6">
            <iframe
              src="https://api.leadconnectorhq.com/widget/survey/VarcMdVarl1QzePQtEih"
              style={{ width: '100%', border: 'none', overflow: 'hidden', minHeight: '600px' }}
              scrolling="no"
              id="VarcMdVarl1QzePQtEih"
              title="Get Started Survey"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default GetStarted;

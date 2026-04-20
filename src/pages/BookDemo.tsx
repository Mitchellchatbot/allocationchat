import { useEffect } from 'react';
import careAssistLogo from '@/assets/care-assist-logo.png';
import { Check } from 'lucide-react';

const BookDemo = () => {
  useEffect(() => {
    // Load LeadConnector embed script
    const script = document.createElement('script');
    script.src = 'https://link.msgsndr.com/js/form_embed.js';
    script.type = 'text/javascript';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
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
        <div className="max-w-3xl w-full text-center space-y-6">
          {/* Success badge */}
          <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 border border-green-500/20 rounded-full px-4 py-2 text-sm font-medium">
            <Check className="w-4 h-4" />
            You're almost there!
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Book Your{' '}
            <span className="text-primary">Free Demo</span>{' '}
            Now
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Pick a time that works for you. We'll show you exactly how Care Assist can capture more leads from your website.
          </p>

          {/* Calendar Embed */}
          <div className="w-full mt-8 rounded-2xl overflow-hidden border border-border/50 shadow-lg bg-card">
            <iframe
              src="https://api.leadconnectorhq.com/widget/booking/C5kO3I7Bw3OE5Xztimzi"
              style={{ width: '100%', border: 'none', overflow: 'hidden', minHeight: '700px' }}
              scrolling="no"
              id="C5kO3I7Bw3OE5Xztimzi_booking"
              title="Book a Demo"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookDemo;

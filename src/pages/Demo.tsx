import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MessageSquare, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { cn } from '@/lib/utils';
import careAssistLogo from '@/assets/scaled-bot-logo.svg';

const Demo = () => {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Nav */}
      <nav className="bg-background/90 backdrop-blur-xl sticky top-0 z-[60] border-b border-border/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>
            <div className="flex items-center gap-2">
              <img src={careAssistLogo} alt="Care Assist" className="h-8 w-8 rounded-lg object-contain" />
              <span className="font-bold text-lg text-foreground">Care Assist Demo</span>
            </div>
            <Link to="/auth">
              <Button className="bg-primary text-primary-foreground rounded-full px-5 h-9 text-sm font-semibold group">
                Start Free <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight mb-4">
            Try the Widget <span className="text-primary">Live</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Experience exactly what your website visitors will see. Chat with the AI as if you were someone looking for treatment options.
          </p>

          {/* View toggle */}
          <div className="inline-flex items-center gap-1 bg-muted/60 rounded-full p-1 border border-border/30">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-full px-4 h-8 text-sm font-medium transition-all',
                viewMode === 'desktop' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
              )}
              onClick={() => setViewMode('desktop')}
            >
              <Monitor className="h-4 w-4 mr-1.5" /> Desktop
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-full px-4 h-8 text-sm font-medium transition-all',
                viewMode === 'mobile' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
              )}
              onClick={() => setViewMode('mobile')}
            >
              <Smartphone className="h-4 w-4 mr-1.5" /> Mobile
            </Button>
          </div>
        </div>

        {/* Demo Area */}
        <div className="flex justify-center">
          <div
            className={cn(
              'relative bg-card rounded-3xl border border-border/50 shadow-2xl overflow-hidden transition-all duration-500',
              viewMode === 'desktop' ? 'w-full max-w-4xl aspect-[16/10]' : 'w-[390px] max-w-full aspect-[9/16] max-h-[700px]'
            )}
          >
            {/* Mock website background */}
            <div className="absolute inset-0 bg-gradient-to-br from-muted/30 via-background to-muted/20 p-6 md:p-10">
              <div className="space-y-4">
                <div className="h-3 w-32 bg-muted/50 rounded-full" />
                <div className="h-8 w-3/4 bg-muted/40 rounded-lg" />
                <div className="h-4 w-1/2 bg-muted/30 rounded-full" />
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="h-24 bg-muted/30 rounded-xl" />
                  <div className="h-24 bg-muted/30 rounded-xl" />
                </div>
                <div className="h-4 w-2/3 bg-muted/20 rounded-full" />
                <div className="h-4 w-1/3 bg-muted/20 rounded-full" />
              </div>
            </div>

            {/* Chat Widget */}
            <div className="absolute inset-2 sm:inset-auto sm:bottom-4 sm:right-4 flex items-end justify-end">
              <ChatWidget
                propertyId="demo"
                isPreview={true}
                autoOpen={true}
                widgetSize="small"
                greeting="Hi there! 👋 I'm so glad you reached out. Before we get started, can I get your first name?"
                agentName="Care Assist"
              />
            </div>
          </div>
        </div>

        {/* CTA below */}
        <div className="text-center mt-10 md:mt-14">
          <p className="text-muted-foreground mb-4">
            Ready to add this to your website?
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-primary text-primary-foreground rounded-2xl px-8 h-13 text-base font-bold shadow-lg shadow-primary/20 group">
              Start 7-Day Free Trial
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Demo;

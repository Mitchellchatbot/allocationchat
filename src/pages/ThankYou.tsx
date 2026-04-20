import { useEffect } from 'react';
import { Check, Calendar, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import careAssistLogo from '@/assets/care-assist-logo.png';
import hopeInstitute from '@/assets/clients/hope-institute.png';
import villaTreatment from '@/assets/clients/villa-treatment.png';
import dynamicBehavioral from '@/assets/clients/dynamic-behavioral.png';
import fortifyWellness from '@/assets/clients/fortify-wellness.png';
import { useNavigate } from 'react-router-dom';

const ThankYou = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const steps = [
    {
      icon: Calendar,
      title: 'Accept Your Invite',
      description: 'Check your email and hit "Accept" on the calendar invite to lock in your spot.',
    },
    {
      icon: Clock,
      title: 'Show Up On Time',
      description: 'Our demos are quick — just 15 minutes. We respect your time.',
    },
    {
      icon: MessageSquare,
      title: 'Bring Your Questions',
      description: 'We\'ll customize the walkthrough to your center\'s specific needs.',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 py-12 md:py-20">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 mx-auto">
            <Check className="w-10 h-10 text-primary" strokeWidth={3} />
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
              You're <span className="text-primary">All Set!</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">
              Your demo is booked. Here's how to get the most out of it.
            </p>
          </div>

          {/* Steps */}
          <div className="grid gap-4 mt-8">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-4 bg-card border border-border/60 rounded-2xl p-5 text-left hover:border-primary/30 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base text-foreground mb-0.5">{step.title}</h3>
                  <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trusted by — sliding row */}
          <div className="pt-4 overflow-hidden">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Trusted by</p>
            <div className="relative">
              <div className="flex items-center gap-10 animate-[slide_16s_linear_infinite]" style={{ width: 'max-content' }}>
                {[...Array(3)].map((_, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-10">
                    <img src={hopeInstitute} alt="The Hope Institute" className="h-8 md:h-10 object-contain opacity-60" />
                    <img src={villaTreatment} alt="Villa Treatment Center" className="h-6 md:h-8 object-contain opacity-60" />
                    <img src={dynamicBehavioral} alt="Dynamic Behavioral Health" className="h-8 md:h-10 object-contain opacity-60" />
                    <img src={fortifyWellness} alt="Fortify Wellness" className="h-6 md:h-8 object-contain opacity-60" />
                  </div>
                ))}
              </div>
              <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Urgency / Value reminder */}
          <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6 mt-6">
            <p className="text-sm md:text-base font-semibold text-foreground mb-1">
              Why show up?
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
              Centers using Care Assist capture <span className="font-bold text-primary">35% more leads</span> and <span className="font-bold text-primary">4 additional VOBs</span> per month on average. We'll show you exactly how.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-4">
            <Button
              onClick={() => navigate('/start')}
              variant="outline"
              className="rounded-full px-8 py-3 text-sm font-semibold border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              Back to Home <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ThankYou;

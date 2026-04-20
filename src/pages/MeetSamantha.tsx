import { Moon, ShieldCheck, Brain, Phone, MessageSquare, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import michaelImg from "@/assets/testimonials/michael.jpg";
import slackIcon from "@/assets/logos/slack.svg";

const features = [
  { icon: Brain, label: "Trained on your facility's language, programs, and admissions process" },
  { icon: ShieldCheck, label: "Medical-safe guardrails — she never diagnoses, never promises" },
  { icon: Phone, label: "Crisis detection — flags emergencies and routes to your crisis line" },
  { icon: MessageSquare, label: "Collects name, insurance, substance, urgency — before you even log in" },
  { icon: () => <img src={slackIcon} alt="Slack" className="h-5 w-5" />, label: "Sends instant Slack alerts so your team can jump in when it matters" },
];

const MeetSamantha = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-10 right-1/4 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
            <Moon className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            What if your best admissions coordinator{" "}
            <span className="text-primary">never slept?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            No vacation. No burnout. No missed calls at 2 AM when someone finally decides to ask for help.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold md:text-4xl">
            Meet <span className="text-primary">Samantha.</span>
          </h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>
              She's not a chatbot. She doesn't say "I'm sorry, I didn't understand that" and loop you back to a menu.
            </p>
            <p>
              <strong className="text-foreground">Samantha is a digital replica</strong> of your best admissions coordinator — built to sound like her, respond like her, and guide families through the hardest conversation of their lives.
            </p>
            <p>
              She lives on your website. She greets every visitor within seconds. And she does it with the same warmth, empathy, and clinical awareness your real team brings — just without the 9-to-5 limitation.
            </p>
          </div>
        </div>
      </section>

      {/* The Shift */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
            <CardContent className="relative p-8 md:p-12">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Clock className="h-7 w-7 text-primary" />
              </div>
              <blockquote className="text-2xl font-semibold leading-snug md:text-3xl">
                "That single shift — from passive to proactive —{" "}
                <span className="text-primary">changes everything.</span>"
              </blockquote>
              <p className="mt-6 text-lg text-muted-foreground">
                Most treatment center websites wait for someone to fill out a form. Samantha doesn't wait. She starts the conversation within <strong className="text-foreground">30 seconds</strong> — before doubt, distraction, or fear takes over.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Checklist */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-3xl font-bold md:text-4xl">What she actually does</h2>
          <p className="mb-10 text-muted-foreground">Every capability, built for behavioral health.</p>
          <div className="space-y-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-xl border border-border/40 bg-card p-5 transition-colors hover:border-primary/30 hover:bg-accent/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-base font-medium">{f.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Card className="border-border/30 bg-card">
            <CardContent className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
              <img
                src={michaelImg}
                alt="Michael R."
                className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/20"
              />
              <blockquote className="max-w-xl text-xl italic leading-relaxed text-muted-foreground">
                "We were losing 60% of after-hours inquiries. Within two weeks of launching Samantha, our admissions calls <span className="font-semibold text-foreground">doubled</span>."
              </blockquote>
              <div>
                <p className="font-semibold">Michael R.</p>
                <p className="text-sm text-muted-foreground">CEO, Serenity Treatment</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold md:text-5xl">
            Your Digital Twin is ready.
            <br />
            <span className="text-primary">Is your website?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Every hour without Samantha is another family you didn't reach. Let's fix that.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="gap-2 px-8 text-base" asChild>
              <a href="/auth">
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 px-8 text-base" asChild>
              <a href="/demo">See a Live Demo</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MeetSamantha;

import { Link } from 'react-router-dom';
import { documentationSections } from '@/data/documentation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, 
  BookOpenCheck,
  MessageSquare, 
  Users, 
  Bot, 
  Palette, 
  Plug, 
  BarChart3,
  ArrowRight,
  Calendar,
  Shield,
  CreditCard
} from 'lucide-react';
import { useFadeIn, useStaggerChildren } from '@/hooks/useGSAP';

const sectionIcons: Record<string, React.ReactNode> = {
  'getting-started': <BookOpen className="h-6 w-6" />,
  'chatbot-manual': <BookOpenCheck className="h-6 w-6" />,
  'inbox': <MessageSquare className="h-6 w-6" />,
  'team': <Users className="h-6 w-6" />,
  'ai-support': <Bot className="h-6 w-6" />,
  'widget': <Palette className="h-6 w-6" />,
  'integrations': <Plug className="h-6 w-6" />,
  'compliance': <Shield className="h-6 w-6" />,
  'account': <CreditCard className="h-6 w-6" />,
  'analytics': <BarChart3 className="h-6 w-6" />,
};

const Documentation = () => {
  const heroRef = useFadeIn<HTMLDivElement>();
  const gridRef = useStaggerChildren<HTMLDivElement>('.doc-card', { delay: 0.1 });
  const helpRef = useFadeIn<HTMLDivElement>({ delay: 0.3 });

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      {/* Hero */}
      <div ref={heroRef} className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Documentation
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Learn how to get the most out of Scaled Bot. Find guides, tips, and detailed explanations for every feature.
        </p>
      </div>

      {/* Sections Grid */}
      <div ref={gridRef} className="grid gap-6 md:grid-cols-2">
        {documentationSections.map((section) => (
          <Card 
            key={section.id} 
            className="doc-card group hover:border-primary/50 transition-colors"
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {sectionIcons[section.id] || <BookOpen className="h-6 w-6" />}
                </div>
                <div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {section.topics.slice(0, 4).map((topic) => (
                  <li key={topic.id}>
                    <Link
                      to={`/documentation/${section.id}/${topic.id}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-3 w-3" />
                      {topic.title}
                    </Link>
                  </li>
                ))}
                {section.topics.length > 4 && (
                  <li className="text-xs text-muted-foreground/70 pl-5">
                    +{section.topics.length - 4} more topics
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Help */}
      <div ref={helpRef} className="mt-12 p-6 rounded-lg border border-border bg-muted/30">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Need more help?
            </h2>
            <p className="text-muted-foreground mb-4">
              Can't find what you're looking for? Send us a message or book a call with our team.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link 
                to="/dashboard/support"
                className="inline-flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Contact Support
              </Link>
              <a 
                href="https://calendly.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium border border-border text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Calendar className="h-4 w-4" />
                Book a Call
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <div className="relative w-full max-w-[240px] aspect-square rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center gap-3 p-6">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Free Strategy Call</p>
              <p className="text-xs text-muted-foreground text-center">30 min consultation with our team</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;

import { useParams, Link } from 'react-router-dom';
import { getSection, getTopic } from '@/data/documentation';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Lightbulb, BookOpen } from 'lucide-react';
import { useFadeIn, useStaggerChildren, useScaleIn } from '@/hooks/useGSAP';

const DocPage = () => {
  const { section: sectionId, topic: topicId } = useParams();
  
  const section = sectionId ? getSection(sectionId) : undefined;
  const topic = sectionId && topicId ? getTopic(sectionId, topicId) : undefined;

  const headerRef = useFadeIn<HTMLDivElement>();
  const stepsRef = useStaggerChildren<HTMLOListElement>('li', { delay: 0.15 });
  const tipsRef = useScaleIn<HTMLDivElement>({ delay: 0.2 });
  const relatedRef = useFadeIn<HTMLElement>({ delay: 0.3 });

  if (!section || !topic) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-6 text-center">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The documentation page you're looking for doesn't exist.
        </p>
        <Link to="/documentation" className="text-primary hover:underline">
          Go to Documentation Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-8">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/documentation">Documentation</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/documentation/${section.id}/${section.topics[0]?.id}`}>
                {section.title}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{topic.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Title */}
      <div ref={headerRef}>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          {topic.title}
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          {topic.description}
        </p>

        {/* What This Does */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            What This Does
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {topic.whatItDoes}
          </p>
        </section>
      </div>

      {/* Detailed Sections */}
      {topic.detailedSections && topic.detailedSections.length > 0 && (
        <div className="mb-8 space-y-6">
          {topic.detailedSections.map((section, index) => (
            <section key={index}>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {section.heading}
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                {section.body.split('\n\n').map((paragraph, pIdx) => (
                  <p key={pIdx}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* How To Use */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-3">
          How To Use It
        </h2>
        <ol ref={stepsRef} className="space-y-3">
          {topic.howToUse.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <span className="text-muted-foreground pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Tips */}
      <Card ref={tipsRef} className="mb-8 border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">Tips</h3>
              <ul className="space-y-2">
                {topic.tips.map((tip, index) => (
                  <li key={index} className="text-muted-foreground text-sm flex gap-2">
                    <span className="text-amber-500">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Related Topics */}
      {topic.relatedTopics && topic.relatedTopics.length > 0 && (
        <section ref={relatedRef}>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Related Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {topic.relatedTopics.map((related, index) => (
              <Link
                key={index}
                to={related.path}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                {related.title}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default DocPage;

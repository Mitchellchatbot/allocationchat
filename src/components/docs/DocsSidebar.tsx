import { Link, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { documentationSections } from '@/data/documentation';
import { ChevronRight, BookOpen } from 'lucide-react';

export const DocsSidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { section: currentSection, topic: currentTopic } = useParams();

  return (
    <aside className="w-64 border-r border-border bg-background h-full overflow-y-auto">
      <div className="p-6">
        <Link 
          to="/documentation" 
          className="flex items-center gap-2 text-lg font-semibold text-foreground mb-6 hover:text-primary transition-colors"
        >
          <BookOpen className="h-5 w-5" />
          Documentation
        </Link>

        <nav className="space-y-6">
          {documentationSections.map((section) => (
            <div key={section.id}>
              <h3 className={cn(
                "text-sm font-medium mb-2 px-2",
                currentSection === section.id ? "text-primary" : "text-muted-foreground"
              )}>
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.topics.map((topic) => {
                  const isActive = currentSection === section.id && currentTopic === topic.id;
                  return (
                    <li key={topic.id}>
                      <Link
                        to={`/documentation/${section.id}/${topic.id}`}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <ChevronRight className={cn(
                          "h-3 w-3 transition-transform",
                          isActive && "rotate-90"
                        )} />
                        {topic.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
};

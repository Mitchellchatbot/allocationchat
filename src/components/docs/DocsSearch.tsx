import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { documentationSections, type DocTopic, type DocSection } from '@/data/documentation';

interface SearchResult {
  topic: DocTopic;
  section: DocSection;
  matchField: string;
  snippet: string;
}

function getAllSearchableText(topic: DocTopic): string {
  return [
    topic.title,
    topic.description,
    topic.whatItDoes,
    ...topic.howToUse,
    ...topic.tips,
  ]
    .join(' ')
    .toLowerCase();
}

function findMatchField(topic: DocTopic, query: string): { field: string; snippet: string } {
  const q = query.toLowerCase();

  if (topic.title.toLowerCase().includes(q)) {
    return { field: 'Title', snippet: topic.title };
  }
  if (topic.description.toLowerCase().includes(q)) {
    return { field: 'Description', snippet: topic.description };
  }
  if (topic.whatItDoes.toLowerCase().includes(q)) {
    return { field: 'Overview', snippet: extractSnippet(topic.whatItDoes, q) };
  }
  for (const step of topic.howToUse) {
    if (step.toLowerCase().includes(q)) {
      return { field: 'How To Use', snippet: step };
    }
  }
  for (const tip of topic.tips) {
    if (tip.toLowerCase().includes(q)) {
      return { field: 'Tip', snippet: tip };
    }
  }
  return { field: 'Content', snippet: topic.description };
}

function extractSnippet(text: string, query: string, radius = 60): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = '…' + snippet;
  if (end < text.length) snippet += '…';
  return snippet;
}

export const DocsSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const words = q.split(/\s+/).filter(Boolean);
    const matches: SearchResult[] = [];

    for (const section of documentationSections) {
      for (const topic of section.topics) {
        const fullText = getAllSearchableText(topic);
        const allWordsMatch = words.every((w) => fullText.includes(w));
        if (allWordsMatch) {
          const { field, snippet } = findMatchField(topic, q.length > 2 ? q : words[0]);
          matches.push({ topic, section, matchField: field, snippet });
        }
      }
    }
    return matches;
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    navigate(`/documentation/${result.section.id}/${result.topic.id}`);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-muted-foreground font-normal w-full sm:w-auto justify-start"
      >
        <Search className="h-4 w-4" />
        <span>Search docs…</span>
        <kbd className="hidden sm:inline-flex ml-auto pointer-events-none h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Search all documentation…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {query.length < 2 ? 'Type at least 2 characters…' : 'No results found.'}
          </CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading={`${results.length} result${results.length !== 1 ? 's' : ''}`}>
              {results.map((r) => (
                <CommandItem
                  key={`${r.section.id}-${r.topic.id}`}
                  value={`${r.section.id}-${r.topic.id}-${r.topic.title}`}
                  onSelect={() => handleSelect(r)}
                  className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{r.topic.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {r.matchField}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {r.section.title} · {r.snippet}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

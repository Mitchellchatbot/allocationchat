import { useState, useEffect, useRef } from 'react';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { supabase } from '@/integrations/supabase/client';

const FALLBACK_SCRIPT = [
  "Hi, my name is Sarah",
  "My brother has been struggling with alcohol and we're not sure where to start",
];

export const LPDemoWidget = () => {
  const [mode, setMode] = useState<'demo' | 'interactive'>('demo');
  const [demoScript, setDemoScript] = useState<string[]>(FALLBACK_SCRIPT);
  const [widgetKey, setWidgetKey] = useState(0);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Fire-and-forget: try to replace fallback with AI-generated script
    // Only works if it loads before autoplay begins typing (~2s)
    let cancelled = false;
    const generate = async () => {
      try {
        const { data } = await supabase.functions.invoke('generate-demo-script');
        if (!cancelled && !scriptLoadedRef.current && data?.lines && Array.isArray(data.lines) && data.lines.length >= 2) {
          setDemoScript(data.lines);
        }
      } catch {
        // Fallback already set, nothing to do
      }
    };
    generate();
    return () => { cancelled = true; };
  }, []);

  // Mark script as "in use" once autoplay would have started (~2s after mount)
  useEffect(() => {
    const timer = setTimeout(() => { scriptLoadedRef.current = true; }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleStartOwnChat = () => {
    setMode('interactive');
    setWidgetKey(prev => prev + 1);
  };

  return (
    <ChatWidget
      key={widgetKey}
      propertyId="demo"
      isPreview={true}
      autoOpen={true}
      widgetSize="small"
      greeting="Hi there! 👋 I'm so glad you reached out. Before we get started, can I get your first name?"
      agentName="Care Assist"
      autoPlayScript={mode === 'demo' ? demoScript : undefined}
      demoOverlay={mode === 'demo'}
      onStartOwnChat={handleStartOwnChat}
    />
  );
};

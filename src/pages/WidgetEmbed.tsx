import { useParams, useSearchParams } from 'react-router-dom';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { useEffect } from 'react';

const WidgetEmbed = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [searchParams] = useSearchParams();

  const primaryColor = searchParams.get('primaryColor') || 'hsl(221, 83%, 53%)';
  const widgetIcon = searchParams.get('widgetIcon') || undefined;
  const greeting = searchParams.get('greeting') || 'Hi there! How can I help you today?';
  const borderRadius = parseInt(searchParams.get('borderRadius') || '24', 10);
  const autoOpen = searchParams.get('autoOpen') !== 'false';
  const effectType = searchParams.get('effectType') || 'none';
  const effectInterval = parseInt(searchParams.get('effectInterval') || '5', 10);
  const effectIntensity = searchParams.get('effectIntensity') || 'medium';

  // Ensure transparency is maintained (WidgetApp already sets initial styles)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.add('widget-embed-mode');
    html.classList.remove('dark');
    
    html.style.setProperty('background', 'transparent', 'important');
    html.style.setProperty('background-color', 'transparent', 'important');
    body.style.setProperty('background', 'transparent', 'important');
    body.style.setProperty('background-color', 'transparent', 'important');
    body.style.setProperty('overflow', 'hidden', 'important');

    return () => {
      html.classList.remove('widget-embed-mode');
      html.style.background = '';
      html.style.backgroundColor = '';
      body.style.background = '';
      body.style.backgroundColor = '';
      body.style.overflow = '';
    };
  }, []);

  if (!propertyId) {
    return <div className="p-4 text-destructive">Property ID is required</div>;
  }

  return (
    <div 
      className="w-full h-full overflow-hidden pointer-events-none"
      style={{ background: 'transparent', backgroundColor: 'transparent' }}
    >
      <ChatWidget
        propertyId={propertyId}
        primaryColor={primaryColor}
        borderRadius={borderRadius}
        greeting={greeting}
        isPreview={false}
        autoOpen={autoOpen}
        widgetIcon={widgetIcon}
        effectType={effectType}
        effectInterval={effectInterval}
        effectIntensity={effectIntensity}
      />
    </div>
  );
};

export default WidgetEmbed;

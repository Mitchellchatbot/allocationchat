import { useState, useEffect, useRef, useCallback } from 'react';
import { usePersistedProperty } from '@/hooks/usePersistedProperty';
import { Copy, Check, Code, Palette, Loader2, Building2, Sparkles, MessageCircle, MessageSquare, MessagesSquare, Headphones, HelpCircle, Heart, Bot, ImagePlus, Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useConversations } from '@/hooks/useConversations';
import { PropertySelector } from '@/components/PropertySelector';
import { WidgetEffectsCard } from '@/components/widget/WidgetEffectsCard';

// Widget icon options (same as onboarding)
const widgetIconOptions = [
  { id: 'message-circle', label: 'Bubble', icon: MessageCircle },
  { id: 'message-square', label: 'Square', icon: MessageSquare },
  { id: 'messages-square', label: 'Chat', icon: MessagesSquare },
  { id: 'headphones', label: 'Support', icon: Headphones },
  { id: 'help-circle', label: 'Help', icon: HelpCircle },
  { id: 'heart', label: 'Heart', icon: Heart },
  { id: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { id: 'bot', label: 'Bot', icon: Bot },
  { id: 'custom', label: 'Custom', icon: ImagePlus },
];

const colorPresets = [{
  name: 'Sage',
  color: 'hsl(150, 25%, 45%)'
}, {
  name: 'Slate',
  color: 'hsl(215, 20%, 50%)'
}, {
  name: 'Lavender',
  color: 'hsl(260, 25%, 55%)'
}, {
  name: 'Dusty Rose',
  color: 'hsl(350, 25%, 55%)'
}, {
  name: 'Warm Gray',
  color: 'hsl(30, 15%, 50%)'
}, {
  name: 'Ocean',
  color: 'hsl(190, 30%, 45%)'
}];

// --- Color conversion utilities ---
const hexToRgb = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
};

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  h /= 360; s /= 100; l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

const rgbToHex = (r: number, g: number, b: number): string =>
  '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

// Parse any color string to RGB
const parseColorToRgb = (color: string): [number, number, number] | null => {
  const hexMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color.trim());
  if (hexMatch) return [parseInt(hexMatch[1], 16), parseInt(hexMatch[2], 16), parseInt(hexMatch[3], 16)];
  const rgbMatch = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(color.trim());
  if (rgbMatch) return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  const hslMatch = /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)$/i.exec(color.trim());
  if (hslMatch) return hslToRgb(parseFloat(hslMatch[1]), parseFloat(hslMatch[2]), parseFloat(hslMatch[3]));
  return null;
};

const formatColor = (color: string, format: 'hex' | 'rgb' | 'hsl'): string => {
  const rgb = parseColorToRgb(color);
  if (!rgb) return color;
  switch (format) {
    case 'hex': return rgbToHex(...rgb);
    case 'rgb': return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    case 'hsl': { const [h, s, l] = rgbToHsl(...rgb); return `hsl(${h}, ${s}%, ${l}%)`; }
  }
};

// Legacy wrapper used elsewhere
const hexToHsl = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [h, s, l] = rgbToHsl(...rgb);
  return `hsl(${h}, ${s}%, ${l}%)`;
};

type ColorFormat = 'hex' | 'rgb' | 'hsl';

// Display Settings Card with Save button
const DisplaySettingsCard = ({
  greeting,
  setGreeting,
  extractedFont,
  propertyId
}: {
  greeting: string;
  setGreeting: (value: string) => void;
  extractedFont: string | null;
  propertyId: string | undefined;
}) => {
  const [localGreeting, setLocalGreeting] = useState(greeting);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    setLocalGreeting(greeting);
    setHasChanges(false);
  }, [greeting]);
  const handleGreetingChange = (value: string) => {
    setLocalGreeting(value);
    setHasChanges(value !== greeting);
  };
  const handleSave = async () => {
    if (!propertyId) return;
    setIsSaving(true);
    const {
      error
    } = await supabase.from('properties').update({
      greeting: localGreeting || null
    }).eq('id', propertyId);
    setIsSaving(false);
    if (error) {
      toast.error('Failed to save settings');
      console.error('Error saving greeting:', error);
      return;
    }
    setGreeting(localGreeting);
    setHasChanges(false);
    toast.success('Welcome message saved!');
  };
  return <Card data-tour="widget-welcome-message">
      <CardHeader>
        <CardTitle className="text-base">Welcome Message</CardTitle>
        <CardDescription>The first message visitors see when they open the chat</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="greeting">Welcome Message</Label>
          <Input id="greeting" value={localGreeting} onChange={e => handleGreetingChange(e.target.value)} placeholder="Hi there! How can I help?" />
          <p className="text-xs text-muted-foreground">
            This message is shared with AI Support settings
          </p>
        </div>
        {extractedFont && <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 inline mr-1" />
              Detected font from your website: <span className="font-medium text-foreground">{extractedFont}</span>
            </p>
          </div>}
        <Button onClick={handleSave} disabled={!hasChanges || isSaving || !propertyId} className="w-full">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Welcome Message
        </Button>
      </CardContent>
    </Card>;
};
const WidgetPreview = () => {
  const {
    properties,
    loading,
    deleteProperty
  } = useConversations();
  const [selectedPropertyId, setSelectedPropertyId] = usePersistedProperty();
  const [primaryColor, setPrimaryColor] = useState('#F97316');
  const [colorFormat, setColorFormat] = useState<ColorFormat>('hsl');
  const [greeting, setGreeting] = useState("Hi there! 👋 How can I help you today?");
  const [copied, setCopied] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedFont, setExtractedFont] = useState<string | null>(null);
  const [widgetIcon, setWidgetIcon] = useState('message-circle');
  const [widgetIconPreview, setWidgetIconPreview] = useState<string | null>(null);
  const [isSavingIcon, setIsSavingIcon] = useState(false);
  const widgetIconInputRef = useRef<HTMLInputElement>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeWidgetTab, setActiveWidgetTab] = useState('widget');
  const [effectType, setEffectType] = useState('none');
  const [effectInterval, setEffectInterval] = useState(5);
  const [effectIntensity, setEffectIntensity] = useState('medium');

  // Listen for tour tab-switch events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tab) setActiveWidgetTab(detail.tab);
    };
    window.addEventListener('tour-switch-tab', handler);
    return () => window.removeEventListener('tour-switch-tab', handler);
  }, []);

  // Load settings whenever selectedPropertyId or properties change
  useEffect(() => {
    if (properties.length === 0) return;

    if (!selectedPropertyId) return;

    const property = properties.find(p => p.id === selectedPropertyId);
    if (!property) return;

    if (property.widget_color && property.widget_color !== '#6B7280') {
      setPrimaryColor(property.widget_color);
    } else {
      extractBrandFromProperty(property.domain, property.id);
    }
    if (property.greeting) setGreeting(property.greeting);
    if (property.widget_icon) setWidgetIcon(property.widget_icon);
    setEffectType((property as any).widget_effect_type || 'none');
    setEffectInterval((property as any).widget_effect_interval_seconds || 5);
    setEffectIntensity((property as any).widget_effect_intensity || 'medium');
  }, [properties, selectedPropertyId]);

  // Update settings when property changes
  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      if (property.widget_color && property.widget_color !== '#6B7280') {
        setPrimaryColor(property.widget_color);
      } else {
        extractBrandFromProperty(property.domain, property.id);
      }
      if (property.greeting) setGreeting(property.greeting);
      if (property.widget_icon) setWidgetIcon(property.widget_icon);
      setEffectType((property as any).widget_effect_type || 'none');
      setEffectInterval((property as any).widget_effect_interval_seconds || 5);
      setEffectIntensity((property as any).widget_effect_intensity || 'medium');
    }
  };
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const extractBrandFromProperty = async (domain: string, propId?: string) => {
    if (!domain) return;
    const targetPropertyId = propId || selectedPropertyId;
    setIsExtracting(true);
    try {
      let url = domain.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      const { data, error } = await supabase.functions.invoke('extract-brand-colors', {
        body: { url }
      });
      if (error) throw error;
      if (data.success && data.branding) {
        const { primaryColor: extractedPrimary, colors, fonts } = data.branding;

        let colorToUse = extractedPrimary || colors?.primary || colors?.accent;
        if (colorToUse) {
          if (colorToUse.startsWith('#')) {
            colorToUse = hexToHsl(colorToUse);
          }
          setPrimaryColor(colorToUse);

          // Persist the extracted color to the database
          if (targetPropertyId) {
            await supabase.from('properties').update({ widget_color: colorToUse }).eq('id', targetPropertyId);
          }
        }

        if (Array.isArray(fonts) && fonts.length > 0 && fonts[0]?.family) {
          setExtractedFont(fonts[0].family);
        }
        toast.success('Brand styles extracted from your website!');
      }
    } catch (error) {
      console.error('Error extracting brand colors:', error);
    } finally {
      setIsExtracting(false);
    }
  };
  const handleSaveWidgetIcon = async () => {
    if (!selectedPropertyId) return;
    setIsSavingIcon(true);
    const { error } = await supabase.from('properties').update({
      widget_icon: widgetIcon,
    }).eq('id', selectedPropertyId);
    setIsSavingIcon(false);
    if (error) {
      toast.error('Failed to save widget icon');
      console.error('Error saving widget icon:', error);
      return;
    }
    toast.success('Widget icon saved!');
  };
  const embedParams = new URLSearchParams({
    primaryColor,
    greeting,
    widgetIcon: widgetIcon || 'message-circle',
    borderRadius: '24',
    autoOpen: 'true',
    effectType,
    effectInterval: String(effectInterval),
    effectIntensity,
  });
  const widgetScript = selectedPropertyId ? `<script>
  (function () {
    if (window.location.search.indexOf('scaledbot_preview=true') !== -1) return;
    var params = ${JSON.stringify(embedParams.toString())};
    var parentUrl = encodeURIComponent(window.location.href);
    var src = 'https://care-assist.io/widget-embed/${selectedPropertyId}?' + params + '&parentUrl=' + parentUrl;
    var iframe = document.createElement('iframe');
    iframe.id = 'scaledbot-widget';
    iframe.src = src;
    iframe.style.cssText = 'position:fixed;bottom:0;right:0;width:88px;height:88px;border:none;z-index:9999;background:transparent;overflow:hidden;';
    iframe.setAttribute('allowtransparency', 'true');
    document.body.appendChild(iframe);
    window.addEventListener('message', function (event) {
      var data = event && event.data;
      if (!data || data.type !== 'scaledbot_widget_resize') return;
      if (typeof data.width === 'number') iframe.style.width = data.width + 'px';
      if (typeof data.height === 'number') iframe.style.height = data.height + 'px';
    });
  })();
</script>` : '// Select a property to generate embed code';
  const handleCopy = () => {
    if (!selectedPropertyId) {
      toast.error('Please select a property first');
      return;
    }
    navigator.clipboard.writeText(widgetScript);
    setCopied(true);
    toast.success('Widget code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };
  if (loading) {
    return <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>;
  }
  if (properties.length === 0) {
    return <DashboardLayout>
        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader title="Widget Customization" />
          <div className="flex-1 p-2 overflow-hidden">
            <div className="h-full overflow-auto scrollbar-hide rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">No Properties Yet</h2>
                <p className="text-muted-foreground mb-4">
                  Create a property first to customize your widget.
                </p>
                <Link to="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>;
  }
  return <DashboardLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <PageHeader
          title="Widget"
          docsLink="/documentation/widget/customization"
          tourSection="widget"
          propertySelector={
            <PropertySelector properties={properties} selectedPropertyId={selectedPropertyId} onPropertyChange={handlePropertyChange} onDeleteProperty={deleteProperty} variant="header" showAddButton />
          }
        />

        <main className="flex-1 p-2 overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Settings Row */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Widget & Code Tabs */}
            <div className="space-y-6">
              <Tabs value={activeWidgetTab} onValueChange={setActiveWidgetTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="widget" className="gap-2" data-tour="widget-customize-tab">
                    <Palette className="h-4 w-4" />
                    Widget
                  </TabsTrigger>
                  <TabsTrigger value="code" className="gap-2" data-tour="widget-embed-tab">
                    <Code className="h-4 w-4" />
                    Embed Code
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="widget" className="mt-6 space-y-6">
                  {/* Widget Icon */}
                  <Card data-tour="widget-icon-card">
                    <CardHeader>
                      <CardTitle className="text-base">Chat Launcher Icon</CardTitle>
                      <CardDescription>Pick an icon for your chat launcher button</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <input
                        type="file"
                        ref={widgetIconInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const previewUrl = URL.createObjectURL(file);
                            setWidgetIcon('custom');
                            setWidgetIconPreview(previewUrl);
                          }
                        }}
                        accept="image/*"
                        className="hidden"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        {widgetIconOptions.map((option) => {
                          const IconComponent = option.icon;
                          const isSelected = widgetIcon === option.id;
                          const isCustomOption = option.id === 'custom';
                          return (
                            <button
                              key={option.id}
                              onClick={() => {
                                if (isCustomOption) {
                                  widgetIconInputRef.current?.click();
                                } else {
                                  setWidgetIcon(option.id);
                                  setWidgetIconPreview(null);
                                }
                              }}
                              className={cn(
                                "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 gap-1.5",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                  : "border-border bg-background hover:border-primary/50 hover:bg-muted/50 hover:scale-[1.02]"
                              )}
                            >
                              {isCustomOption && widgetIconPreview ? (
                                <img src={widgetIconPreview} alt="Custom icon" className="h-6 w-6 rounded object-cover" />
                              ) : (
                                <IconComponent className={cn("h-6 w-6 transition-transform duration-200", isSelected ? "scale-110" : "")} />
                              )}
                              <span className={cn("text-xs font-medium", isSelected ? "" : "text-muted-foreground")}>
                                {option.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <Button onClick={handleSaveWidgetIcon} disabled={isSavingIcon || !selectedPropertyId} className="w-full">
                        {isSavingIcon ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save Widget Icon
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Brand Color */}
                  <Card data-tour="widget-color-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Brand Color</CardTitle>
                          <CardDescription>
                            Choose your primary widget color
                            {isExtracting && <span className="flex items-center gap-2 mt-1 text-primary">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Extracting from your website...
                              </span>}
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isExtracting || !selectedProperty?.domain}
                          onClick={() => selectedProperty && extractBrandFromProperty(selectedProperty.domain, selectedProperty.id)}
                        >
                          {isExtracting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                          Re-extract
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-6 gap-3 mb-4">
                        {colorPresets.map(preset => <button key={preset.name} onClick={() => setPrimaryColor(preset.color)} className="h-10 w-10 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" style={{ backgroundColor: preset.color }} title={preset.name} />)}
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {(['hex', 'rgb', 'hsl'] as ColorFormat[]).map(fmt => (
                          <button
                            key={fmt}
                            onClick={() => {
                              setColorFormat(fmt);
                              setPrimaryColor(formatColor(primaryColor, fmt));
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-xs font-semibold uppercase transition-colors",
                              colorFormat === fmt
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                            )}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={primaryColor}
                          onChange={e => setPrimaryColor(e.target.value)}
                          placeholder={
                            colorFormat === 'hex' ? '#FF6600' :
                            colorFormat === 'rgb' ? 'rgb(255, 102, 0)' :
                            'hsl(24, 100%, 50%)'
                          }
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (!selectedPropertyId) return;
                            // Always save as HSL for consistency
                            const hslValue = formatColor(primaryColor, 'hsl');
                            const { error } = await supabase.from('properties').update({ widget_color: hslValue }).eq('id', selectedPropertyId);
                            if (error) { toast.error('Failed to save color'); return; }
                            toast.success('Brand color saved!');
                          }}
                          disabled={!selectedPropertyId}
                        >
                          Save
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="code" className="mt-6">
                  <Card data-tour="widget-embed-code">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Code className="h-5 w-5" />
                        Embed Code
                        {selectedProperty && <span className="text-xs font-normal text-muted-foreground ml-2">for {selectedProperty.name}</span>}
                      </CardTitle>
                      <CardDescription>
                        Add this code to your website's HTML, just before the closing &lt;/body&gt; tag
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!selectedPropertyId ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Code className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Select a property first</p>
                            <p className="text-sm text-muted-foreground mt-1">Choose a property from the dropdown above to generate its embed code.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <pre className="bg-sidebar text-sidebar-foreground p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap break-all">
                            <code>{widgetScript}</code>
                          </pre>
                          <Button onClick={handleCopy} size="sm" variant="secondary" className="absolute top-2 right-2">
                            {copied ? <><Check className="h-4 w-4 mr-1" />Copied</> : <><Copy className="h-4 w-4 mr-1" />Copy</>}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Display Settings */}
            <div className="space-y-6">
              <DisplaySettingsCard greeting={greeting} setGreeting={setGreeting} extractedFont={extractedFont} propertyId={selectedPropertyId} />
              <div data-tour="widget-effects-card">
              <WidgetEffectsCard
                propertyId={selectedPropertyId}
                effectType={effectType}
                effectInterval={effectInterval}
                effectIntensity={effectIntensity}
                primaryColor={primaryColor}
                widgetIcon={widgetIcon}
                onEffectTypeChange={setEffectType}
                onEffectIntervalChange={setEffectInterval}
                onEffectIntensityChange={setEffectIntensity}
              />
              </div>
            </div>
          </div>

          {/* Preview - Full Width Below */}
          <Card className="overflow-hidden" data-tour="widget-preview">
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {previewMode === 'desktop' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                    Widget Preview
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Sparkles className="h-3 w-3" />
                    {selectedProperty?.domain ? `Preview on ${selectedProperty.domain}` : 'Select a property to see a live preview'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1" data-tour="widget-preview-toggle">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      previewMode === 'desktop' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Desktop view"
                  >
                    <Monitor className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      previewMode === 'mobile' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Mobile view"
                  >
                    <Smartphone className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex justify-center">
              {previewMode === 'mobile' ? (
                <div className="relative w-[75vw] max-w-[400px] aspect-[9/19.5] bg-gradient-to-br from-secondary to-muted overflow-hidden rounded-[2.5rem] shadow-xl">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-foreground/20 rounded-b-xl z-10" />
                  {selectedProperty?.domain ? (
                    <FitScaledIframe
                      src={`https://${selectedProperty.domain.replace(/^https?:\/\//, '')}?scaledbot_preview=true`}
                      title={`Mobile preview of ${selectedProperty.name}`}
                      viewportWidth={390}
                      viewportHeight={844}
                      sandbox="allow-scripts allow-same-origin"
                      loading="lazy"
                      iframeClassName="pointer-events-auto"
                    />
                  ) : (
                    <div className="p-6 pt-10">
                      <div className="h-6 w-32 bg-foreground/10 rounded mb-4" />
                      <div className="space-y-2">
                        <div className="h-3 w-full bg-foreground/5 rounded" />
                        <div className="h-3 w-5/6 bg-foreground/5 rounded" />
                        <div className="h-3 w-4/6 bg-foreground/5 rounded" />
                      </div>
                      <div className="mt-6 space-y-3">
                        <div className="h-24 bg-foreground/5 rounded-lg" />
                        <div className="h-24 bg-foreground/5 rounded-lg" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-4 right-4 origin-bottom-right scale-75">
                    <ChatWidget propertyId={selectedPropertyId || ''} primaryColor={primaryColor} greeting={greeting} isPreview={true} widgetIcon={widgetIcon} effectType={effectType} effectInterval={effectInterval} effectIntensity={effectIntensity} />
                  </div>
                </div>
              ) : (
              <div className="relative w-full aspect-[16/10]">
                  <div className="relative w-full h-full bg-gradient-to-br from-secondary to-muted overflow-hidden rounded-lg shadow-lg">
                    <div className="h-8 bg-foreground/10 flex items-center px-3 gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-destructive/50" />
                        <div className="w-3 h-3 rounded-full bg-status-away/50" />
                        <div className="w-3 h-3 rounded-full bg-status-online/50" />
                      </div>
                      <div className="flex-1 mx-4">
                        <div className="h-5 bg-background/50 rounded-md flex items-center px-3">
                          <span className="text-xs text-muted-foreground truncate">
                            {selectedProperty?.domain ? `https://${selectedProperty.domain.replace(/^https?:\/\//, '')}` : 'https://your-website.com'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="relative h-[calc(100%-2rem)] overflow-hidden">
                      {selectedProperty?.domain ? (
                        <FitScaledIframe
                        src={`https://${selectedProperty.domain.replace(/^https?:\/\//, '')}?scaledbot_preview=true`}
                          title={`Desktop preview of ${selectedProperty.name}`}
                          viewportWidth={1440}
                          viewportHeight={900}
                          sandbox="allow-scripts allow-same-origin"
                          loading="lazy"
                          iframeClassName="pointer-events-auto"
                        />
                      ) : (
                        <div className="p-8">
                          <div className="max-w-4xl mx-auto">
                            <div className="h-10 w-64 bg-foreground/10 rounded mb-8" />
                            <div className="grid grid-cols-3 gap-6 mb-8">
                              <div className="h-40 bg-foreground/5 rounded-lg" />
                              <div className="h-40 bg-foreground/5 rounded-lg" />
                              <div className="h-40 bg-foreground/5 rounded-lg" />
                            </div>
                            <div className="space-y-3">
                              <div className="h-4 w-full bg-foreground/5 rounded" />
                              <div className="h-4 w-5/6 bg-foreground/5 rounded" />
                              <div className="h-4 w-4/6 bg-foreground/5 rounded" />
                              <div className="h-4 w-3/4 bg-foreground/5 rounded" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-4 right-4 origin-bottom-right scale-75">
                        <ChatWidget propertyId={selectedPropertyId || ''} primaryColor={primaryColor} greeting={greeting} isPreview={true} widgetIcon={widgetIcon} effectType={effectType} effectInterval={effectInterval} effectIntensity={effectIntensity} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </main>
      </div>
      <DashboardTour />
    </DashboardLayout>;
};

type FitScaledIframeProps = {
  src: string;
  title: string;
  viewportWidth: number;
  viewportHeight: number;
  sandbox?: string;
  loading?: "lazy" | "eager";
  className?: string;
  iframeClassName?: string;
  maxScale?: number;
};

function FitScaledIframe({
  src,
  title,
  viewportWidth,
  viewportHeight,
  sandbox,
  loading = "lazy",
  className,
  iframeClassName,
  maxScale = 1,
}: FitScaledIframeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready = containerSize.width > 0 && containerSize.height > 0;
  const scale = ready
    ? Math.max(
        containerSize.width / viewportWidth,
        containerSize.height / viewportHeight
      )
    : 1;

  const left = 0;
  const top = 0;

  return (
    <div ref={containerRef} className={cn("relative w-full h-full overflow-hidden", className)}>
      <div
        className="absolute"
        style={{
          width: viewportWidth,
          height: viewportHeight,
          left,
          top,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          visibility: ready ? "visible" : "hidden",
        }}
      >
        <iframe
          src={src}
          className={cn("w-full h-full border-0", iframeClassName)}
          title={title}
          sandbox={sandbox}
          loading={loading}
        />
      </div>
    </div>
  );
}

export default WidgetPreview;
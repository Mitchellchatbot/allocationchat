import { useState, useEffect, useCallback } from 'react';
import { Wand2, Loader2, MessageCircle, MessageSquare, MessagesSquare, Headphones, HelpCircle, Heart, Sparkles, Bot, LucideIcon, Ban } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const widgetIconMap: Record<string, LucideIcon> = {
  'message-circle': MessageCircle,
  'message-square': MessageSquare,
  'messages-square': MessagesSquare,
  'headphones': Headphones,
  'help-circle': HelpCircle,
  'heart': Heart,
  'sparkles': Sparkles,
  'bot': Bot,
};

const effectOptions = [
  { id: 'none', label: 'None' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'wiggle', label: 'Wiggle' },
  { id: 'ring', label: 'Ring' },
  { id: 'heartbeat', label: 'Heartbeat' },
] as const;

const intensityOptions = [
  { id: 'subtle', label: 'Subtle' },
  { id: 'medium', label: 'Medium' },
  { id: 'strong', label: 'Strong' },
] as const;

// Generate inline animation style for a mini preview button
const getMiniAnimation = (effect: string, intensity: string): string => {
  if (effect === 'none') return '';
  const s = intensity === 'subtle' ? 0 : intensity === 'strong' ? 2 : 1;
  const scale = [1.05, 1.1, 1.15][s];
  const bounce = [6, 10, 16][s];
  const bounceSmall = [3, 5, 8][s];
  const rotate = [5, 10, 15][s];
  const rotateSmall = [3, 6, 10][s];
  const ringScale = [1.6, 1.8, 2.2][s];

  switch (effect) {
    case 'pulse':
      return `widget-fx-pulse-${intensity} 1s ease-in-out infinite`;
    case 'bounce':
      return `widget-fx-bounce-${intensity} 0.8s ease-out infinite`;
    case 'wiggle':
      return `widget-fx-wiggle-${intensity} 0.6s ease-in-out infinite`;
    case 'heartbeat':
      return `widget-fx-heartbeat-${intensity} 1s ease-in-out infinite`;
    case 'ring':
      return ''; // ring is handled separately
    default:
      return '';
  }
};

const generateKeyframes = (intensity: string) => {
  const s = intensity === 'subtle' ? 0 : intensity === 'strong' ? 2 : 1;
  const scale = [1.05, 1.1, 1.15][s];
  const bounce = [6, 10, 16][s];
  const bounceSmall = [3, 5, 8][s];
  const rotate = [5, 10, 15][s];
  const rotateSmall = [3, 6, 10][s];
  const hbBig = [1.08, 1.14, 1.2][s];
  const hbSmall = [1.05, 1.1, 1.15][s];
  const ringScale = [1.6, 1.8, 2.2][s];

  return `
    @keyframes widget-fx-pulse-${intensity} {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(${scale}); }
    }
    @keyframes widget-fx-bounce-${intensity} {
      0%, 100% { transform: translateY(0); }
      30% { transform: translateY(-${bounce}px); }
      50% { transform: translateY(0); }
      70% { transform: translateY(-${bounceSmall}px); }
    }
    @keyframes widget-fx-wiggle-${intensity} {
      0%, 100% { transform: rotate(0deg); }
      20% { transform: rotate(${rotate}deg); }
      40% { transform: rotate(-${rotate}deg); }
      60% { transform: rotate(${rotateSmall}deg); }
      80% { transform: rotate(-${rotateSmall}deg); }
    }
    @keyframes widget-fx-heartbeat-${intensity} {
      0%, 100% { transform: scale(1); }
      15% { transform: scale(${hbBig}); }
      30% { transform: scale(1); }
      45% { transform: scale(${hbSmall}); }
      60% { transform: scale(1); }
    }
    @keyframes widget-fx-ring-${intensity} {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(${ringScale}); opacity: 0; }
    }
  `;
};

interface WidgetEffectsCardProps {
  propertyId: string | undefined;
  effectType: string;
  effectInterval: number;
  effectIntensity: string;
  primaryColor: string;
  widgetIcon: string;
  onEffectTypeChange: (type: string) => void;
  onEffectIntervalChange: (interval: number) => void;
  onEffectIntensityChange: (intensity: string) => void;
}

export const WidgetEffectsCard = ({
  propertyId,
  effectType,
  effectInterval,
  effectIntensity,
  primaryColor,
  widgetIcon,
  onEffectTypeChange,
  onEffectIntervalChange,
  onEffectIntensityChange,
}: WidgetEffectsCardProps) => {
  const [localType, setLocalType] = useState(effectType);
  const [localInterval, setLocalInterval] = useState(effectInterval);
  const [localIntensity, setLocalIntensity] = useState(effectIntensity);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Track which mini-button is currently demoing (on click)
  const [demoEffect, setDemoEffect] = useState<string | null>(null);

  const IconComponent = widgetIconMap[widgetIcon] || MessageCircle;

  const [initializedFor, setInitializedFor] = useState(propertyId);
  useEffect(() => {
    if (propertyId !== initializedFor) {
      setLocalType(effectType);
      setLocalInterval(effectInterval);
      setLocalIntensity(effectIntensity);
      setHasChanges(false);
      setInitializedFor(propertyId);
    }
  }, [propertyId, effectType, effectInterval, effectIntensity, initializedFor]);

  const updateLocal = (type: string, interval: number, intensity: string) => {
    setHasChanges(true);
    onEffectTypeChange(type);
    onEffectIntervalChange(interval);
    onEffectIntensityChange(intensity);
  };

  const handleSelectEffect = useCallback((id: string) => {
    setLocalType(id);
    updateLocal(id, localInterval, localIntensity);
    // Trigger demo animation on the clicked button
    setDemoEffect(null); // reset first to retrigger
    requestAnimationFrame(() => setDemoEffect(id));
    // Clear after animation
    setTimeout(() => setDemoEffect(null), 1200);
  }, [localInterval, localIntensity]);

  const handleSave = async () => {
    if (!propertyId) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('properties')
      .update({
        widget_effect_type: localType,
        widget_effect_interval_seconds: localInterval,
        widget_effect_intensity: localIntensity,
      })
      .eq('id', propertyId);
    setIsSaving(false);
    if (error) {
      toast.error('Failed to save effects');
      return;
    }
    setHasChanges(false);
    toast.success('Widget effects saved!');
  };

  return (
    <Card>
      <style>{generateKeyframes('subtle')}{generateKeyframes('medium')}{generateKeyframes('strong')}</style>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Launcher Effects
        </CardTitle>
        <CardDescription>
          Periodic animations on the chat button to grab attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Effect Type - mini icon buttons */}
        <div className="space-y-2">
          <Label>Effect Style</Label>
          <div className="grid grid-cols-3 gap-3">
            {effectOptions.map((opt) => {
              const isSelected = localType === opt.id;
              const isDemoing = demoEffect === opt.id;
              const animStyle: React.CSSProperties =
                isDemoing && opt.id !== 'none'
                  ? { animation: getMiniAnimation(opt.id, localIntensity) || undefined }
                  : {};

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectEffect(opt.id)}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-3 px-2 rounded-xl border-2 transition-all duration-200 gap-2",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  {/* Mini launcher preview */}
                  <div className="relative">
                    {/* Ring ripple */}
                    {isDemoing && opt.id === 'ring' && (
                      <div
                        className="absolute inset-0 rounded-full bg-foreground/30"
                        style={{
                          animation: `widget-fx-ring-${localIntensity} 1s ease-out forwards`,
                        }}
                      />
                    )}
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center border-2 border-foreground/20 bg-background"
                      style={animStyle}
                    >
                      {opt.id === 'none' ? (
                        <Ban className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <IconComponent className="h-4 w-4 text-foreground/70" />
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interval */}
        {localType !== 'none' && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Repeat Every</Label>
                <span className="text-sm text-muted-foreground font-mono">{localInterval}s</span>
              </div>
              <Slider
                value={[localInterval]}
                onValueChange={([v]) => {
                  setLocalInterval(v);
                  updateLocal(localType, v, localIntensity);
                }}
                min={3}
                max={30}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>3s (frequent)</span>
                <span>30s (rare)</span>
              </div>
            </div>

            {/* Intensity */}
            <div className="space-y-2">
              <Label>Intensity</Label>
              <div className="flex gap-2">
                {intensityOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setLocalIntensity(opt.id);
                      updateLocal(localType, localInterval, opt.id);
                      // Re-demo with new intensity
                      setDemoEffect(null);
                      requestAnimationFrame(() => setDemoEffect(localType));
                      setTimeout(() => setDemoEffect(null), 1200);
                    }}
                    className={cn(
                      "flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-all duration-200",
                      localIntensity === opt.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background hover:border-primary/50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving || !propertyId}
          className="w-full"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Effects
        </Button>
      </CardContent>
    </Card>
  );
};

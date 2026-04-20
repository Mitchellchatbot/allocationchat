import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  feature: string;
  requiredPlan?: string;
}

export function UpgradePrompt({ feature, requiredPlan = 'Professional' }: UpgradePromptProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 rounded-xl border border-border bg-muted/30 text-center">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground text-lg">{feature} requires {requiredPlan}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upgrade your plan to unlock this feature.
        </p>
      </div>
      <Button onClick={() => navigate('/dashboard/subscription')}>
        View Plans
      </Button>
    </div>
  );
}

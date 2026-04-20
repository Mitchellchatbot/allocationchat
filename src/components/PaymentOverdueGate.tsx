import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';

export const PaymentOverdueGate = ({ children }: { children: React.ReactNode }) => {
  const { status, isComped, loading } = useSubscription();
  const { signOut } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  const isOverdue = !loading && status === 'past_due' && !isComped;

  if (!isOverdue) return <>{children}</>;

  const handleUpdatePayment = async () => {
    setRedirecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-billing-portal');
      if (error || !data?.url) throw new Error('Failed to open billing portal');
      window.location.href = data.url;
    } catch {
      setRedirecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Payment overdue</h1>
          <p className="text-muted-foreground">
            Your subscription payment is past due. Please update your payment method to restore access.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full"
          onClick={handleUpdatePayment}
          disabled={redirecting}
        >
          {redirecting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening billing portal...</>
          ) : (
            'Update Payment Method'
          )}
        </Button>
        <button
          onClick={() => signOut()}
          className="text-sm text-muted-foreground hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

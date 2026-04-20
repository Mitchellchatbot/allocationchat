import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Mail, RefreshCw } from 'lucide-react';
import careAssistLogo from '@/assets/scaled-bot-logo.svg';

interface TwoFactorVerificationProps {
  userId: string;
  email: string;
  isSetup?: boolean; // true when enabling 2FA for the first time
  onVerified: () => void;
  onCancel?: () => void;
}

export const TwoFactorVerification = ({
  userId,
  email,
  isSetup = false,
  onVerified,
  onCancel,
}: TwoFactorVerificationProps) => {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(() => {
    const sentAt = sessionStorage.getItem('2fa_code_sent_at');
    return sentAt ? Date.now() - Number(sentAt) < 60000 : false;
  });
  const [resendCooldown, setResendCooldown] = useState(() => {
    const sentAt = sessionStorage.getItem('2fa_code_sent_at');
    if (!sentAt) return 0;
    const remaining = Math.ceil(60 - (Date.now() - Number(sentAt)) / 1000);
    return remaining > 0 ? remaining : 0;
  });
  const { toast } = useToast();

  const sendCode = async () => {
    setSending(true);
    const { error } = await supabase.functions.invoke('send-2fa-code', {
      body: { email, userId },
    });
    setSending(false);

    if (error) {
      toast({ title: 'Failed to send code', description: 'Please try again.', variant: 'destructive' });
      return;
    }

    setCodeSent(true);
    setResendCooldown(60);
    sessionStorage.setItem('2fa_code_sent_at', String(Date.now()));
    toast({ title: 'Code sent!', description: `A verification code has been sent to ${email}` });
  };

  // Auto-send code on first mount only (skip if recently sent)
  useEffect(() => {
    const sentAt = sessionStorage.getItem('2fa_code_sent_at');
    const recentlySent = sentAt && Date.now() - Number(sentAt) < 60000;
    if (!recentlySent) {
      sendCode();
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (code.length !== 6) return;

    setVerifying(true);
    const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
      body: { userId, code, enableAfterVerify: isSetup },
    });
    setVerifying(false);

    if (error || !data?.verified) {
      toast({ title: 'Invalid code', description: 'The code is incorrect or has expired.', variant: 'destructive' });
      setCode('');
      return;
    }

    toast({ title: isSetup ? '2FA Enabled!' : 'Verified!', description: isSetup ? 'Two-factor authentication is now active on your account.' : 'Successfully verified.' });
    sessionStorage.removeItem('2fa_code_sent_at');
    sessionStorage.removeItem('show2FASetup');
    onVerified();
  };

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-primary/5 p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] page-enter">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-2">
            <img src={careAssistLogo} alt="Care Assist" className="h-[8rem] w-auto" />
          </div>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isSetup ? 'Enable Two-Factor Authentication' : 'Two-Factor Verification'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isSetup
              ? 'To comply with HIPAA requirements, verify your email to enable 2FA.'
              : `Enter the 6-digit code sent to ${maskedEmail}`}
          </p>
        </div>

        <div className="bg-card border border-border/30 shadow-2xl shadow-primary/[0.06] rounded-2xl p-6 space-y-6">
          {codeSent && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 border border-primary/10">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm text-foreground/80">
                Code sent to <span className="font-medium">{maskedEmail}</span>
              </p>
            </div>
          )}

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerify}
            disabled={code.length !== 6 || verifying}
            className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20"
          >
            {verifying ? 'Verifying...' : isSetup ? 'Enable 2FA' : 'Verify & Sign In'}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={sendCode}
              disabled={resendCooldown > 0 || sending}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </Button>
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
                Cancel
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Two-factor authentication is required for HIPAA compliance to protect sensitive health information.
        </p>
      </div>
    </div>
  );
};

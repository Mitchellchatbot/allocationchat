ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_payment_reminder_at timestamptz;

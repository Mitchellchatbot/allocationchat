-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_id text,
  status text NOT NULL DEFAULT 'trialing',
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  current_period_end timestamptz,
  is_comped boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access"
  ON public.subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger function to auto-create subscription for new clients
CREATE OR REPLACE FUNCTION public.handle_new_client_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'client' THEN
    INSERT INTO public.subscriptions (user_id, status, trial_ends_at)
    VALUES (NEW.user_id, 'trialing', now() + interval '14 days')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_client_role_create_subscription
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_client_subscription();

-- Grandfather all existing clients as comped
INSERT INTO public.subscriptions (user_id, status, is_comped, trial_ends_at)
SELECT ur.user_id, 'comped', true, now() + interval '14 days'
FROM public.user_roles ur
WHERE ur.role = 'client'
ON CONFLICT (user_id) DO NOTHING;

-- Ensure henry@scaledai.org is comped
UPDATE public.subscriptions
SET is_comped = true, status = 'comped'
WHERE user_id = (
  SELECT user_id FROM public.profiles WHERE email = 'henry@scaledai.org' LIMIT 1
);
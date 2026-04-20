
-- Add two_factor_enabled to profiles
ALTER TABLE public.profiles ADD COLUMN two_factor_enabled boolean NOT NULL DEFAULT false;

-- Create table for 2FA OTP codes
CREATE TABLE public.two_factor_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own codes (needed for verification edge function via service role)
-- No direct client access needed - edge functions use service role
CREATE POLICY "Service role only" ON public.two_factor_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_two_factor_codes_user_id ON public.two_factor_codes (user_id, used, expires_at);

-- Cleanup old codes periodically (codes expire after 10 minutes)

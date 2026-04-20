
-- Create notification_logs table for tracking all notification activity
CREATE TABLE public.notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- 'new_conversation', 'escalation', 'phone_collected'
  channel text NOT NULL, -- 'email', 'slack', 'sms'
  recipient text NOT NULL, -- email address, slack channel, or phone number
  recipient_type text NOT NULL DEFAULT 'team', -- 'team' or 'client'
  status text NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'skipped'
  error_message text,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  visitor_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Property owners can view their notification logs
CREATE POLICY "Property owners can view notification logs"
ON public.notification_logs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM properties p
  WHERE p.id = notification_logs.property_id AND p.user_id = auth.uid()
));

-- Service role inserts (edge functions use service key, so no INSERT policy needed for authenticated users)
-- But let's add one for service-level inserts from edge functions
CREATE POLICY "Service can insert notification logs"
ON public.notification_logs
FOR INSERT
WITH CHECK (true);

-- Add index for efficient querying
CREATE INDEX idx_notification_logs_property_id ON public.notification_logs(property_id);
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at DESC);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_logs;

-- Create slack_notification_settings table
CREATE TABLE public.slack_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  channel_name TEXT,
  notify_on_new_conversation BOOLEAN NOT NULL DEFAULT true,
  notify_on_escalation BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);

-- Create email_notification_settings table
CREATE TABLE public.email_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  notification_emails TEXT[] DEFAULT '{}',
  notify_on_new_conversation BOOLEAN NOT NULL DEFAULT true,
  notify_on_escalation BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);

-- Enable RLS
ALTER TABLE public.slack_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for slack_notification_settings
CREATE POLICY "Users can view their own slack settings" 
ON public.slack_notification_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = slack_notification_settings.property_id 
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own slack settings" 
ON public.slack_notification_settings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = slack_notification_settings.property_id 
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own slack settings" 
ON public.slack_notification_settings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = slack_notification_settings.property_id 
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own slack settings" 
ON public.slack_notification_settings 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = slack_notification_settings.property_id 
    AND properties.user_id = auth.uid()
  )
);

-- RLS policies for email_notification_settings
CREATE POLICY "Users can view their own email settings" 
ON public.email_notification_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = email_notification_settings.property_id 
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own email settings" 
ON public.email_notification_settings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = email_notification_settings.property_id 
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own email settings" 
ON public.email_notification_settings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = email_notification_settings.property_id 
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own email settings" 
ON public.email_notification_settings 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = email_notification_settings.property_id 
    AND properties.user_id = auth.uid()
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_slack_notification_settings_updated_at
BEFORE UPDATE ON public.slack_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_notification_settings_updated_at
BEFORE UPDATE ON public.email_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
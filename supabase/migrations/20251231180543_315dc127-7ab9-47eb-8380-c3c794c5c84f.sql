-- Create table for Salesforce integration settings per property
CREATE TABLE public.salesforce_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  instance_url TEXT,
  refresh_token TEXT,
  access_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  auto_export_on_escalation BOOLEAN NOT NULL DEFAULT false,
  auto_export_on_conversation_end BOOLEAN NOT NULL DEFAULT false,
  field_mappings JSONB NOT NULL DEFAULT '{
    "FirstName": "name",
    "Email": "email",
    "Phone": "phone",
    "Description": "conversation_transcript"
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);

-- Enable RLS
ALTER TABLE public.salesforce_settings ENABLE ROW LEVEL SECURITY;

-- Property owners can manage their Salesforce settings
CREATE POLICY "Property owners can view salesforce settings"
ON public.salesforce_settings
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM properties p
  WHERE p.id = salesforce_settings.property_id
  AND p.user_id = auth.uid()
));

CREATE POLICY "Property owners can insert salesforce settings"
ON public.salesforce_settings
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM properties p
  WHERE p.id = salesforce_settings.property_id
  AND p.user_id = auth.uid()
));

CREATE POLICY "Property owners can update salesforce settings"
ON public.salesforce_settings
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM properties p
  WHERE p.id = salesforce_settings.property_id
  AND p.user_id = auth.uid()
));

CREATE POLICY "Property owners can delete salesforce settings"
ON public.salesforce_settings
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM properties p
  WHERE p.id = salesforce_settings.property_id
  AND p.user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_salesforce_settings_updated_at
BEFORE UPDATE ON public.salesforce_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table to track exported leads
CREATE TABLE public.salesforce_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  salesforce_lead_id TEXT NOT NULL,
  exported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exported_by UUID REFERENCES auth.users(id),
  export_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'auto'
  UNIQUE(conversation_id, salesforce_lead_id)
);

-- Enable RLS
ALTER TABLE public.salesforce_exports ENABLE ROW LEVEL SECURITY;

-- Property owners can view exports for their conversations
CREATE POLICY "Property owners can view salesforce exports"
ON public.salesforce_exports
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM conversations c
  JOIN properties p ON p.id = c.property_id
  WHERE c.id = salesforce_exports.conversation_id
  AND p.user_id = auth.uid()
));

CREATE POLICY "Property owners can insert salesforce exports"
ON public.salesforce_exports
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM conversations c
  JOIN properties p ON p.id = c.property_id
  WHERE c.id = salesforce_exports.conversation_id
  AND p.user_id = auth.uid()
));
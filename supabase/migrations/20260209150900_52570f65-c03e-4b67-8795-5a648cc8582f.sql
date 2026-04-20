
-- =============================================
-- HIPAA COMPLIANCE: Audit Logging
-- =============================================

-- Create PHI audit log table
CREATE TABLE public.phi_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  action text NOT NULL, -- 'view', 'update', 'export', 'delete'
  resource_type text NOT NULL, -- 'visitor', 'conversation', 'message'
  resource_id uuid NOT NULL,
  property_id uuid,
  phi_fields_accessed text[], -- which PHI fields were accessed
  ip_address text,
  user_agent text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phi_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and property owners can view audit logs
CREATE POLICY "Property owners can view their audit logs"
ON public.phi_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = phi_audit_logs.property_id
    AND p.user_id = auth.uid()
  )
);

-- Authenticated users can insert audit logs (for their own actions)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.phi_audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Nobody can update or delete audit logs (immutable for compliance)
-- No UPDATE or DELETE policies = immutable

-- Index for efficient querying
CREATE INDEX idx_phi_audit_logs_property_id ON public.phi_audit_logs(property_id);
CREATE INDEX idx_phi_audit_logs_created_at ON public.phi_audit_logs(created_at);
CREATE INDEX idx_phi_audit_logs_user_id ON public.phi_audit_logs(user_id);
CREATE INDEX idx_phi_audit_logs_resource ON public.phi_audit_logs(resource_type, resource_id);

-- =============================================
-- HIPAA COMPLIANCE: Data Retention Settings
-- =============================================

CREATE TABLE public.data_retention_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  retention_days integer NOT NULL DEFAULT 365,
  auto_purge_enabled boolean NOT NULL DEFAULT false,
  last_purge_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);

ALTER TABLE public.data_retention_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property owners can manage retention settings"
ON public.data_retention_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = data_retention_settings.property_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Property owners can insert retention settings"
ON public.data_retention_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = data_retention_settings.property_id
    AND p.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_data_retention_settings_updated_at
BEFORE UPDATE ON public.data_retention_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- HIPAA COMPLIANCE: Session timeout setting on profiles
-- =============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS session_timeout_minutes integer NOT NULL DEFAULT 15;

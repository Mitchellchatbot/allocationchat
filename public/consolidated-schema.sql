-- ============================================================
-- CONSOLIDATED SCHEMA BACKUP
-- Project: CareAssist / Live Reach
-- Generated: 2026-03-09
-- This file recreates the entire public schema from scratch.
-- Run against a clean Supabase project (after auth schema exists).
-- ============================================================

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'client', 'agent');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- --- account_co_owners ---
CREATE TABLE public.account_co_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  co_owner_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, co_owner_user_id)
);

-- --- profiles ---
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text,
  company_name text,
  avatar_url text,
  onboarding_complete boolean NOT NULL DEFAULT false,
  dashboard_tour_complete boolean NOT NULL DEFAULT false,
  session_timeout_minutes integer NOT NULL DEFAULT 15,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --- user_roles ---
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- --- properties ---
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  domain text NOT NULL,
  widget_color text DEFAULT '#6B7280',
  widget_icon text DEFAULT 'message-circle',
  widget_effect_type text DEFAULT 'none',
  widget_effect_intensity text DEFAULT 'medium',
  widget_effect_interval_seconds integer DEFAULT 5,
  greeting text DEFAULT 'Hi there! How can we help you today?',
  offline_message text DEFAULT 'We are currently offline. Leave a message!',
  proactive_message text,
  proactive_message_enabled boolean DEFAULT false,
  proactive_message_delay_seconds integer DEFAULT 30,
  ai_base_prompt text,
  ai_response_delay_min_ms integer DEFAULT 1000,
  ai_response_delay_max_ms integer DEFAULT 2500,
  typing_indicator_min_ms integer DEFAULT 1500,
  typing_indicator_max_ms integer DEFAULT 3000,
  smart_typing_enabled boolean DEFAULT true,
  typing_wpm integer DEFAULT 60,
  human_typos_enabled boolean DEFAULT true,
  drop_capitalization_enabled boolean DEFAULT true,
  drop_apostrophes_enabled boolean DEFAULT true,
  max_ai_messages_before_escalation integer DEFAULT 5,
  auto_escalation_enabled boolean DEFAULT true,
  escalation_keywords text[] DEFAULT ARRAY['crisis','emergency','suicide','help me','urgent'],
  require_email_before_chat boolean DEFAULT false,
  require_name_before_chat boolean DEFAULT false,
  require_phone_before_chat boolean DEFAULT false,
  require_insurance_card_before_chat boolean DEFAULT false,
  natural_lead_capture_enabled boolean DEFAULT true,
  quick_reply_after_first_enabled boolean DEFAULT false,
  calendly_url text,
  business_phone text,
  business_email text,
  business_address text,
  business_hours text,
  business_description text,
  business_logo_url text,
  geo_filter_mode text NOT NULL DEFAULT 'anywhere',
  geo_allowed_states text[] NOT NULL DEFAULT '{}',
  geo_blocked_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --- agents ---
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  avatar text,
  avatar_url text,
  status text NOT NULL DEFAULT 'offline',
  invitation_status text DEFAULT 'accepted',
  invitation_token text UNIQUE,
  invitation_expires_at timestamptz,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --- property_agents ---
CREATE TABLE public.property_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  agent_id uuid NOT NULL REFERENCES public.agents(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --- visitors ---
CREATE TABLE public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  session_id text NOT NULL,
  name text,
  email text,
  phone text,
  browser_info text,
  location text,
  current_page text,
  age text,
  occupation text,
  addiction_history text,
  drug_of_choice text,
  treatment_interest text,
  insurance_info text,
  urgency_level text,
  gclid text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --- conversations ---
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  visitor_id uuid NOT NULL REFERENCES public.visitors(id),
  assigned_agent_id uuid REFERENCES public.agents(id),
  status text NOT NULL DEFAULT 'pending',
  is_test boolean NOT NULL DEFAULT false,
  ai_enabled boolean NOT NULL DEFAULT true,
  ai_queued_at timestamptz,
  ai_queued_paused boolean DEFAULT false,
  ai_queued_preview text,
  ai_queued_window_ms integer,
  last_visitor_message_at timestamptz,
  last_extraction_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --- messages ---
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id),
  sender_id text NOT NULL,
  sender_type text NOT NULL,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  sequence_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --- notification_logs ---
CREATE TABLE public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  conversation_id uuid REFERENCES public.conversations(id),
  notification_type text NOT NULL,
  channel text NOT NULL,
  recipient text NOT NULL,
  recipient_type text NOT NULL DEFAULT 'team',
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  visitor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --- email_notification_settings ---
CREATE TABLE public.email_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES public.properties(id),
  enabled boolean NOT NULL DEFAULT false,
  notify_on_new_conversation boolean NOT NULL DEFAULT true,
  notify_on_escalation boolean NOT NULL DEFAULT true,
  notify_on_phone_submission boolean NOT NULL DEFAULT true,
  notification_emails text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --- slack_notification_settings ---
CREATE TABLE public.slack_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES public.properties(id),
  enabled boolean NOT NULL DEFAULT false,
  notify_on_new_conversation boolean NOT NULL DEFAULT true,
  notify_on_escalation boolean NOT NULL DEFAULT true,
  notify_on_phone_submission boolean NOT NULL DEFAULT true,
  legacy_webhook_url text,
  channel_name text,
  access_token text,
  team_id text,
  team_name text,
  bot_user_id text,
  incoming_webhook_channel text,
  incoming_webhook_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --- salesforce_settings ---
CREATE TABLE public.salesforce_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES public.properties(id),
  enabled boolean NOT NULL DEFAULT false,
  client_id text,
  client_secret text,
  access_token text,
  refresh_token text,
  instance_url text,
  token_expires_at timestamptz,
  pending_oauth_token text,
  pending_code_verifier text,
  pending_oauth_expires_at timestamptz,
  auto_export_on_escalation boolean NOT NULL DEFAULT false,
  auto_export_on_conversation_end boolean NOT NULL DEFAULT false,
  auto_export_on_insurance_detected boolean NOT NULL DEFAULT false,
  auto_export_on_phone_detected boolean NOT NULL DEFAULT false,
  field_mappings jsonb NOT NULL DEFAULT '{"Email":"email","Phone":"phone","FirstName":"name","Description":"conversation_transcript"}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --- salesforce_exports ---
CREATE TABLE public.salesforce_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id),
  salesforce_lead_id text NOT NULL,
  export_type text NOT NULL DEFAULT 'manual',
  exported_by uuid,
  exported_at timestamptz NOT NULL DEFAULT now()
);

-- --- two_factor_codes ---
CREATE TABLE public.two_factor_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --- phi_audit_logs ---
CREATE TABLE public.phi_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  property_id uuid,
  user_email text,
  phi_fields_accessed text[],
  ip_address text,
  user_agent text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --- data_retention_settings ---
CREATE TABLE public.data_retention_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES public.properties(id),
  retention_days integer NOT NULL DEFAULT 365,
  auto_purge_enabled boolean NOT NULL DEFAULT false,
  last_purge_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --- page_analytics_events ---
CREATE TABLE public.page_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  url text NOT NULL,
  page_title text,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --- video_call_signals ---
CREATE TABLE public.video_call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id),
  caller_id text NOT NULL,
  caller_type text NOT NULL,
  signal_type text NOT NULL,
  signal_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --- ai_agents ---
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  avatar_url text,
  personality_prompt text,
  status text NOT NULL DEFAULT 'active',
  linked_agent_id uuid REFERENCES public.agents(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --- ai_agent_properties ---
CREATE TABLE public.ai_agent_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_agent_id uuid NOT NULL REFERENCES public.ai_agents(id),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ai_agent_id, property_id)
);

-- --- agent_complaints ---
CREATE TABLE public.agent_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id),
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. INDEXES (non-primary-key, non-unique-constraint)
-- ============================================================

CREATE INDEX idx_agents_invitation_token ON public.agents USING btree (invitation_token);
CREATE INDEX idx_ai_agents_linked_agent ON public.ai_agents USING btree (linked_agent_id);
CREATE INDEX idx_messages_conversation_sequence ON public.messages USING btree (conversation_id, sequence_number);
CREATE INDEX idx_notification_logs_property_id ON public.notification_logs USING btree (property_id);
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs USING btree (created_at DESC);
CREATE INDEX idx_page_analytics_events_property_time ON public.page_analytics_events USING btree (property_id, created_at DESC);
CREATE INDEX idx_page_analytics_events_type ON public.page_analytics_events USING btree (event_type);
CREATE INDEX idx_page_analytics_events_url ON public.page_analytics_events USING btree (url);
CREATE INDEX idx_phi_audit_logs_user_id ON public.phi_audit_logs USING btree (user_id);
CREATE INDEX idx_phi_audit_logs_property_id ON public.phi_audit_logs USING btree (property_id);
CREATE INDEX idx_phi_audit_logs_resource ON public.phi_audit_logs USING btree (resource_type, resource_id);
CREATE INDEX idx_phi_audit_logs_created_at ON public.phi_audit_logs USING btree (created_at);

-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_account_owner_ids(user_uuid uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT user_uuid
  UNION
  SELECT owner_user_id FROM public.account_co_owners WHERE co_owner_user_id = user_uuid
$$;

CREATE OR REPLACE FUNCTION public.user_owns_property(property_uuid uuid, user_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = property_uuid
    AND user_id IN (SELECT public.get_account_owner_ids(user_uuid))
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_agent_for_property(property_uuid uuid, user_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_agents pa
    JOIN public.agents a ON a.id = pa.agent_id
    WHERE pa.property_id = property_uuid AND a.user_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.property_exists(property_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.properties WHERE id = property_uuid)
$$;

CREATE OR REPLACE FUNCTION public.conversation_exists(conv_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversations WHERE id = conv_uuid)
$$;

CREATE OR REPLACE FUNCTION public.visitor_owns_conversation(conv_id uuid, visitor_session text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.visitors v ON v.id = c.visitor_id
    WHERE c.id = conv_id AND v.session_id = visitor_session
  )
$$;

CREATE OR REPLACE FUNCTION public.visitor_matches_session(visitor_uuid uuid, visitor_session_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.visitors WHERE id = visitor_uuid AND session_id = visitor_session_id
  )
$$;

CREATE OR REPLACE FUNCTION public.check_onboarding_complete(user_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'pg_temp' AS $$
  SELECT COALESCE(
    (SELECT onboarding_complete FROM public.profiles WHERE user_id = user_uuid LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.mark_onboarding_complete(user_uuid uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'pg_catalog', 'pg_temp' AS $$
  UPDATE public.profiles SET onboarding_complete = true, updated_at = now() WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.lookup_user_id_by_email(lookup_email text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT user_id FROM public.profiles WHERE email = lower(lookup_email) LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.clear_accepted_invitation_token()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.invitation_status = 'accepted' THEN
    NEW.invitation_token := NULL;
    NEW.invitation_expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_new_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.notification_logs (
    property_id, conversation_id, notification_type, channel, recipient, recipient_type, status, visitor_name
  ) VALUES (
    NEW.property_id, NEW.id, 'new_conversation', 'in_app', 'system', 'system', 'sent', NULL
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_new_property()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.notification_logs (
    property_id, notification_type, channel, recipient, recipient_type, status
  ) VALUES (
    NEW.id, 'property_added', 'in_app', 'system', 'system', 'sent'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_agent_invitation_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  prop_id uuid;
BEGIN
  IF OLD.invitation_status IS DISTINCT FROM 'accepted' AND NEW.invitation_status = 'accepted' AND NEW.invited_by IS NOT NULL THEN
    SELECT id INTO prop_id FROM public.properties WHERE user_id = NEW.invited_by LIMIT 1;
    IF prop_id IS NOT NULL THEN
      INSERT INTO public.notification_logs (
        property_id, notification_type, channel, recipient, recipient_type, status, visitor_name
      ) VALUES (prop_id, 'invitation_accepted', 'in_app', 'system', 'system', 'sent', NEW.name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_agent_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  prop_id uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('online', 'offline') THEN
    SELECT pa.property_id INTO prop_id FROM public.property_agents pa WHERE pa.agent_id = NEW.id LIMIT 1;
    IF prop_id IS NULL AND NEW.invited_by IS NOT NULL THEN
      SELECT id INTO prop_id FROM public.properties WHERE user_id = NEW.invited_by LIMIT 1;
    END IF;
    IF prop_id IS NOT NULL THEN
      INSERT INTO public.notification_logs (
        property_id, notification_type, channel, recipient, recipient_type, status, visitor_name
      ) VALUES (
        prop_id,
        CASE WHEN NEW.status = 'online' THEN 'agent_online' ELSE 'agent_offline' END,
        'in_app', 'system', 'system', 'sent', NEW.name
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_agent_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  agent_record RECORD;
BEGIN
  SELECT * INTO agent_record
  FROM public.agents
  WHERE email = NEW.email AND invitation_status = 'pending'
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.agents
    SET user_id = NEW.id, invitation_status = 'accepted',
        invitation_token = NULL, invitation_expires_at = NULL, updated_at = now()
    WHERE id = agent_record.id;
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'user';
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'agent') ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'user';
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_conversation_presence(p_visitor_id uuid, p_session_id text, p_status text DEFAULT 'active')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_conv_id uuid;
  v_current_status text;
  v_valid boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.visitors WHERE id = p_visitor_id AND session_id = p_session_id) INTO v_valid;
  IF NOT v_valid THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthorized'); END IF;

  SELECT id, status INTO v_conv_id, v_current_status
  FROM public.conversations WHERE visitor_id = p_visitor_id ORDER BY created_at DESC LIMIT 1;

  IF v_conv_id IS NULL THEN RETURN jsonb_build_object('ok', true, 'updated', false); END IF;
  IF p_status = 'closed' AND v_current_status = 'closed' THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'status', 'closed');
  END IF;

  UPDATE public.conversations SET status = p_status, updated_at = now() WHERE id = v_conv_id;
  RETURN jsonb_build_object('ok', true, 'updated', true, 'conversationId', v_conv_id, 'status', p_status);
END;
$$;

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- Auth triggers (must be created on auth.users — run separately if needed):
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- CREATE TRIGGER on_auth_user_created_agent AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_agent_signup();

-- updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_notification_settings_updated_at BEFORE UPDATE ON public.email_notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_slack_notification_settings_updated_at BEFORE UPDATE ON public.slack_notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salesforce_settings_updated_at BEFORE UPDATE ON public.salesforce_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_retention_settings_updated_at BEFORE UPDATE ON public.data_retention_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_complaints_updated_at BEFORE UPDATE ON public.agent_complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Business logic triggers
CREATE TRIGGER clear_invitation_token_on_accept BEFORE UPDATE ON public.agents FOR EACH ROW WHEN ((NEW.invitation_status = 'accepted') AND (OLD.invitation_status <> 'accepted')) EXECUTE FUNCTION clear_accepted_invitation_token();
CREATE TRIGGER on_agent_invitation_accepted AFTER UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION log_agent_invitation_accepted();
CREATE TRIGGER trg_agent_status_change AFTER UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION log_agent_status_change();
CREATE TRIGGER trg_log_new_conversation AFTER INSERT ON public.conversations FOR EACH ROW EXECUTE FUNCTION log_new_conversation();
CREATE TRIGGER trg_log_new_property AFTER INSERT ON public.properties FOR EACH ROW EXECUTE FUNCTION log_new_property();

-- ============================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.account_co_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salesforce_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salesforce_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phi_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_call_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_complaints ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. RLS POLICIES
-- ============================================================

-- --- account_co_owners ---
CREATE POLICY "Owners can add co-owners" ON public.account_co_owners FOR INSERT TO public WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owners can remove co-owners" ON public.account_co_owners FOR DELETE TO public USING (owner_user_id = auth.uid());
CREATE POLICY "Owners can view their co-owners" ON public.account_co_owners FOR SELECT TO public USING ((owner_user_id = auth.uid()) OR (co_owner_user_id = auth.uid()));

-- --- profiles ---
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO public USING (auth.uid() = user_id);
CREATE POLICY "Co-owners can view owner profiles" ON public.profiles FOR SELECT TO public USING (user_id IN (SELECT get_account_owner_ids(auth.uid())));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO public USING (has_role(auth.uid(), 'admin'));

-- --- user_roles ---
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO public USING (has_role(auth.uid(), 'admin'));

-- --- properties ---
CREATE POLICY "Users can view their own properties" ON public.properties FOR SELECT TO public USING (user_id IN (SELECT get_account_owner_ids(auth.uid())));
CREATE POLICY "Users can create their own properties" ON public.properties FOR INSERT TO public WITH CHECK (user_id IN (SELECT get_account_owner_ids(auth.uid())));
CREATE POLICY "Users can update their own properties" ON public.properties FOR UPDATE TO public USING (user_id IN (SELECT get_account_owner_ids(auth.uid())));
CREATE POLICY "Users can delete their own properties" ON public.properties FOR DELETE TO public USING (user_id IN (SELECT get_account_owner_ids(auth.uid())));
CREATE POLICY "Assigned agents can view properties" ON public.properties FOR SELECT TO public USING (user_is_agent_for_property(id, auth.uid()));
CREATE POLICY "Admins can view all properties" ON public.properties FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- --- agents ---
CREATE POLICY "Users can view their own agent profile" ON public.agents FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own agent profile" ON public.agents FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agent profile" ON public.agents FOR UPDATE TO public USING (auth.uid() = user_id);
CREATE POLICY "Clients can view agents they invited" ON public.agents FOR SELECT TO public USING (invited_by IN (SELECT get_account_owner_ids(auth.uid())));
CREATE POLICY "Clients can manage agents they invited" ON public.agents FOR ALL TO public USING (invited_by IN (SELECT get_account_owner_ids(auth.uid())));
CREATE POLICY "Admins can view all agents" ON public.agents FOR SELECT TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all agents" ON public.agents FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can look up pending invitations by token" ON public.agents FOR SELECT TO public USING ((invitation_status = 'pending') AND (invitation_token IS NOT NULL));

-- --- property_agents ---
CREATE POLICY "Property owners can manage agents" ON public.property_agents FOR ALL TO public USING (user_owns_property(property_id, auth.uid()));
CREATE POLICY "Agents can view their assignments" ON public.property_agents FOR SELECT TO public USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = property_agents.agent_id AND a.user_id = auth.uid()));

-- --- visitors ---
CREATE POLICY "Widget can create visitors for valid properties" ON public.visitors FOR INSERT TO anon, authenticated WITH CHECK (property_exists(property_id));
CREATE POLICY "Property owners can view visitors" ON public.visitors FOR SELECT TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = visitors.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Property owners can update visitors" ON public.visitors FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = visitors.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Assigned agents can view visitors" ON public.visitors FOR SELECT TO public USING (EXISTS (SELECT 1 FROM property_agents pa JOIN agents a ON a.id = pa.agent_id WHERE pa.property_id = visitors.property_id AND a.user_id = auth.uid()));
CREATE POLICY "Assigned agents can update visitors" ON public.visitors FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM property_agents pa JOIN agents a ON a.id = pa.agent_id WHERE pa.property_id = visitors.property_id AND a.user_id = auth.uid()));
CREATE POLICY "Admins can view all visitors" ON public.visitors FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- --- conversations ---
CREATE POLICY "Widget can create conversations for valid properties" ON public.conversations FOR INSERT TO anon, authenticated WITH CHECK (property_exists(property_id));
CREATE POLICY "Widget can read valid conversations" ON public.conversations FOR SELECT TO anon USING (true);
CREATE POLICY "Property owners can view conversations" ON public.conversations FOR SELECT TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = conversations.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Property owners can update conversations" ON public.conversations FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = conversations.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Property owners can update ai queue state" ON public.conversations FOR UPDATE TO public
  USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = conversations.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM properties p WHERE p.id = conversations.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Property owners can delete conversations" ON public.conversations FOR DELETE TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = conversations.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Assigned agents can view conversations" ON public.conversations FOR SELECT TO public USING (EXISTS (SELECT 1 FROM property_agents pa JOIN agents a ON a.id = pa.agent_id WHERE pa.property_id = conversations.property_id AND a.user_id = auth.uid()));
CREATE POLICY "Assigned agents can update conversations" ON public.conversations FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM property_agents pa JOIN agents a ON a.id = pa.agent_id WHERE pa.property_id = conversations.property_id AND a.user_id = auth.uid()));
CREATE POLICY "Admins can view all conversations" ON public.conversations FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- --- messages ---
CREATE POLICY "Anyone can create messages for valid conversations" ON public.messages FOR INSERT TO anon, authenticated WITH CHECK (conversation_exists(conversation_id));
CREATE POLICY "Widget can read messages for valid conversations" ON public.messages FOR SELECT TO anon USING (conversation_exists(conversation_id));
CREATE POLICY "Property owners can view messages" ON public.messages FOR SELECT TO public USING (EXISTS (SELECT 1 FROM conversations c JOIN properties p ON p.id = c.property_id WHERE c.id = messages.conversation_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Property owners can update messages" ON public.messages FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM conversations c JOIN properties p ON p.id = c.property_id WHERE c.id = messages.conversation_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Assigned agents can view their conversation messages" ON public.messages FOR SELECT TO public USING (
  (EXISTS (SELECT 1 FROM conversations c JOIN agents a ON a.id = c.assigned_agent_id WHERE c.id = messages.conversation_id AND a.user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM conversations c JOIN property_agents pa ON pa.property_id = c.property_id JOIN agents a ON a.id = pa.agent_id WHERE c.id = messages.conversation_id AND c.assigned_agent_id IS NULL AND a.user_id = auth.uid()))
);
CREATE POLICY "Assigned agents can insert their conversation messages" ON public.messages FOR INSERT TO public WITH CHECK (
  (EXISTS (SELECT 1 FROM conversations c JOIN agents a ON a.id = c.assigned_agent_id WHERE c.id = messages.conversation_id AND a.user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM conversations c JOIN property_agents pa ON pa.property_id = c.property_id JOIN agents a ON a.id = pa.agent_id WHERE c.id = messages.conversation_id AND c.assigned_agent_id IS NULL AND a.user_id = auth.uid()))
);
CREATE POLICY "Assigned agents can update their conversation messages" ON public.messages FOR UPDATE TO public USING (
  (EXISTS (SELECT 1 FROM conversations c JOIN agents a ON a.id = c.assigned_agent_id WHERE c.id = messages.conversation_id AND a.user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM conversations c JOIN property_agents pa ON pa.property_id = c.property_id JOIN agents a ON a.id = pa.agent_id WHERE c.id = messages.conversation_id AND c.assigned_agent_id IS NULL AND a.user_id = auth.uid()))
);
CREATE POLICY "Admins can view all messages" ON public.messages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- --- notification_logs ---
CREATE POLICY "Authenticated users can insert notification logs" ON public.notification_logs FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Property owners can view notification logs" ON public.notification_logs FOR SELECT TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = notification_logs.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));

-- --- email_notification_settings ---
CREATE POLICY "Users can view their own email settings" ON public.email_notification_settings FOR SELECT TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = email_notification_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Users can insert their own email settings" ON public.email_notification_settings FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM properties p WHERE p.id = email_notification_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Users can update their own email settings" ON public.email_notification_settings FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = email_notification_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Users can delete their own email settings" ON public.email_notification_settings FOR DELETE TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = email_notification_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));

-- --- slack_notification_settings ---
CREATE POLICY "Users can view their own slack settings" ON public.slack_notification_settings FOR SELECT TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = slack_notification_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Users can insert their own slack settings" ON public.slack_notification_settings FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM properties p WHERE p.id = slack_notification_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Users can update their own slack settings" ON public.slack_notification_settings FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = slack_notification_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Users can delete their own slack settings" ON public.slack_notification_settings FOR DELETE TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = slack_notification_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));

-- --- salesforce_settings ---
CREATE POLICY "Property owners can view salesforce settings" ON public.salesforce_settings FOR SELECT TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = salesforce_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Property owners can insert salesforce settings" ON public.salesforce_settings FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM properties p WHERE p.id = salesforce_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Property owners can update salesforce settings" ON public.salesforce_settings FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = salesforce_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Property owners can delete salesforce settings" ON public.salesforce_settings FOR DELETE TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = salesforce_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));

-- --- salesforce_exports ---
CREATE POLICY "Property owners can view salesforce exports" ON public.salesforce_exports FOR SELECT TO public USING (EXISTS (SELECT 1 FROM conversations c JOIN properties p ON p.id = c.property_id WHERE c.id = salesforce_exports.conversation_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Property owners can insert salesforce exports" ON public.salesforce_exports FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM conversations c JOIN properties p ON p.id = c.property_id WHERE c.id = salesforce_exports.conversation_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));

-- --- two_factor_codes ---
CREATE POLICY "Service role only" ON public.two_factor_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --- phi_audit_logs ---
CREATE POLICY "Authenticated users can insert audit logs" ON public.phi_audit_logs FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Property owners can view their audit logs" ON public.phi_audit_logs FOR SELECT TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = phi_audit_logs.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));

-- --- data_retention_settings ---
CREATE POLICY "Property owners can insert retention settings" ON public.data_retention_settings FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM properties p WHERE p.id = data_retention_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Property owners can manage retention settings" ON public.data_retention_settings FOR ALL TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = data_retention_settings.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));

-- --- page_analytics_events ---
CREATE POLICY "Widget can insert analytics for valid properties" ON public.page_analytics_events FOR INSERT TO public WITH CHECK (property_exists(property_id));
CREATE POLICY "Property owners can view page analytics" ON public.page_analytics_events FOR SELECT TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = page_analytics_events.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));

-- --- video_call_signals ---
CREATE POLICY "Anyone can insert signals for valid conversations" ON public.video_call_signals FOR INSERT TO public WITH CHECK (conversation_exists(conversation_id));
CREATE POLICY "Property owners can view video signals" ON public.video_call_signals FOR SELECT TO public USING (EXISTS (SELECT 1 FROM conversations c JOIN properties p ON p.id = c.property_id WHERE c.id = video_call_signals.conversation_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Assigned agents can view video signals" ON public.video_call_signals FOR SELECT TO public USING (EXISTS (SELECT 1 FROM conversations c JOIN property_agents pa ON pa.property_id = c.property_id JOIN agents a ON a.id = pa.agent_id WHERE c.id = video_call_signals.conversation_id AND a.user_id = auth.uid()));

-- --- ai_agents ---
CREATE POLICY "Users can view their own AI agents" ON public.ai_agents FOR SELECT TO public USING (owner_id IN (SELECT get_account_owner_ids(auth.uid())));
CREATE POLICY "Users can create their own AI agents" ON public.ai_agents FOR INSERT TO public WITH CHECK (owner_id IN (SELECT get_account_owner_ids(auth.uid())));
CREATE POLICY "Users can update their own AI agents" ON public.ai_agents FOR UPDATE TO public USING (owner_id IN (SELECT get_account_owner_ids(auth.uid())));
CREATE POLICY "Users can delete their own AI agents" ON public.ai_agents FOR DELETE TO public USING (owner_id IN (SELECT get_account_owner_ids(auth.uid())));

-- --- ai_agent_properties ---
CREATE POLICY "Users can view their AI agent properties" ON public.ai_agent_properties FOR SELECT TO public USING (EXISTS (SELECT 1 FROM ai_agents a WHERE a.id = ai_agent_properties.ai_agent_id AND a.owner_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Users can assign properties to their AI agents" ON public.ai_agent_properties FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM ai_agents a WHERE a.id = ai_agent_properties.ai_agent_id AND a.owner_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Users can remove property assignments from their AI agents" ON public.ai_agent_properties FOR DELETE TO public USING (EXISTS (SELECT 1 FROM ai_agents a WHERE a.id = ai_agent_properties.ai_agent_id AND a.owner_id IN (SELECT get_account_owner_ids(auth.uid()))));

-- --- agent_complaints ---
CREATE POLICY "Agents can submit complaints" ON public.agent_complaints FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_complaints.agent_id AND a.user_id = auth.uid()));
CREATE POLICY "Agents can view their own complaints" ON public.agent_complaints FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_complaints.agent_id AND a.user_id = auth.uid()));
CREATE POLICY "Property owners can view complaints" ON public.agent_complaints FOR SELECT TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = agent_complaints.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Property owners can update complaints" ON public.agent_complaints FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = agent_complaints.property_id AND p.user_id IN (SELECT get_account_owner_ids(auth.uid()))));
CREATE POLICY "Admins can view all complaints" ON public.agent_complaints FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all complaints" ON public.agent_complaints FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- 8. REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_logs;

-- ============================================================
-- 9. STORAGE BUCKETS
-- ============================================================

-- Storage bucket: agent-avatars (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('agent-avatars', 'agent-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- END OF CONSOLIDATED SCHEMA
-- ============================================================

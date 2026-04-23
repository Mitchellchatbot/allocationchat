
-- 1. Create account_co_owners table
CREATE TABLE public.account_co_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  co_owner_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, co_owner_user_id)
);

ALTER TABLE public.account_co_owners ENABLE ROW LEVEL SECURITY;

-- Only the primary owner can manage co-owners
CREATE POLICY "Owners can view their co-owners"
  ON public.account_co_owners FOR SELECT
  USING (owner_user_id = auth.uid() OR co_owner_user_id = auth.uid());

CREATE POLICY "Owners can add co-owners"
  ON public.account_co_owners FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can remove co-owners"
  ON public.account_co_owners FOR DELETE
  USING (owner_user_id = auth.uid());

-- 2. Create helper function: given a user, returns the set of owner_user_ids whose data they can access
-- (themselves + any owner who added them as co-owner)
CREATE OR REPLACE FUNCTION public.get_account_owner_ids(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- The user themselves
  SELECT user_uuid
  UNION
  -- Any primary owner who granted this user co-owner access
  SELECT owner_user_id FROM public.account_co_owners WHERE co_owner_user_id = user_uuid
$$;

-- 3. Helper: check if a user is a member of the account that owns a property
CREATE OR REPLACE FUNCTION public.user_owns_property(property_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = property_uuid 
    AND user_id IN (SELECT public.get_account_owner_ids(user_uuid))
  );
$$;

-- 4. Update properties RLS policies
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
CREATE POLICY "Users can view their own properties"
  ON public.properties FOR SELECT
  USING (user_id IN (SELECT public.get_account_owner_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can create their own properties" ON public.properties;
CREATE POLICY "Users can create their own properties"
  ON public.properties FOR INSERT
  WITH CHECK (user_id IN (SELECT public.get_account_owner_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
CREATE POLICY "Users can update their own properties"
  ON public.properties FOR UPDATE
  USING (user_id IN (SELECT public.get_account_owner_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;
CREATE POLICY "Users can delete their own properties"
  ON public.properties FOR DELETE
  USING (user_id IN (SELECT public.get_account_owner_ids(auth.uid())));

-- 5. Update conversations RLS policies
DROP POLICY IF EXISTS "Property owners can view conversations" ON public.conversations;
CREATE POLICY "Property owners can view conversations"
  ON public.conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = conversations.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Property owners can update conversations" ON public.conversations;
CREATE POLICY "Property owners can update conversations"
  ON public.conversations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = conversations.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Property owners can update ai queue state" ON public.conversations;
CREATE POLICY "Property owners can update ai queue state"
  ON public.conversations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = conversations.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = conversations.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Property owners can delete conversations" ON public.conversations;
CREATE POLICY "Property owners can delete conversations"
  ON public.conversations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = conversations.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

-- 6. Update visitors RLS policies
DROP POLICY IF EXISTS "Property owners can view visitors" ON public.visitors;
CREATE POLICY "Property owners can view visitors"
  ON public.visitors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = visitors.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Property owners can update visitors" ON public.visitors;
CREATE POLICY "Property owners can update visitors"
  ON public.visitors FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = visitors.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

-- 7. Update messages RLS policies
DROP POLICY IF EXISTS "Property owners can view messages" ON public.messages;
CREATE POLICY "Property owners can view messages"
  ON public.messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.properties p ON p.id = c.property_id
    WHERE c.id = messages.conversation_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Property owners can update messages" ON public.messages;
CREATE POLICY "Property owners can update messages"
  ON public.messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.properties p ON p.id = c.property_id
    WHERE c.id = messages.conversation_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

-- 8. Update agents RLS policies
DROP POLICY IF EXISTS "Clients can view agents they invited" ON public.agents;
CREATE POLICY "Clients can view agents they invited"
  ON public.agents FOR SELECT
  USING (invited_by IN (SELECT public.get_account_owner_ids(auth.uid())));

DROP POLICY IF EXISTS "Clients can manage agents they invited" ON public.agents;
CREATE POLICY "Clients can manage agents they invited"
  ON public.agents FOR ALL
  USING (invited_by IN (SELECT public.get_account_owner_ids(auth.uid())));

-- 9. Update settings tables
DROP POLICY IF EXISTS "Users can view their own slack settings" ON public.slack_notification_settings;
CREATE POLICY "Users can view their own slack settings"
  ON public.slack_notification_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = slack_notification_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can insert their own slack settings" ON public.slack_notification_settings;
CREATE POLICY "Users can insert their own slack settings"
  ON public.slack_notification_settings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = slack_notification_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can update their own slack settings" ON public.slack_notification_settings;
CREATE POLICY "Users can update their own slack settings"
  ON public.slack_notification_settings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = slack_notification_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can delete their own slack settings" ON public.slack_notification_settings;
CREATE POLICY "Users can delete their own slack settings"
  ON public.slack_notification_settings FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = slack_notification_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

-- Email notification settings
DROP POLICY IF EXISTS "Users can view their own email settings" ON public.email_notification_settings;
CREATE POLICY "Users can view their own email settings"
  ON public.email_notification_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = email_notification_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can insert their own email settings" ON public.email_notification_settings;
CREATE POLICY "Users can insert their own email settings"
  ON public.email_notification_settings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = email_notification_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can update their own email settings" ON public.email_notification_settings;
CREATE POLICY "Users can update their own email settings"
  ON public.email_notification_settings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = email_notification_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can delete their own email settings" ON public.email_notification_settings;
CREATE POLICY "Users can delete their own email settings"
  ON public.email_notification_settings FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = email_notification_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

-- Salesforce settings
DROP POLICY IF EXISTS "Property owners can view salesforce settings" ON public.salesforce_settings;
CREATE POLICY "Property owners can view salesforce settings"
  ON public.salesforce_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = salesforce_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Property owners can insert salesforce settings" ON public.salesforce_settings;
CREATE POLICY "Property owners can insert salesforce settings"
  ON public.salesforce_settings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = salesforce_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Property owners can update salesforce settings" ON public.salesforce_settings;
CREATE POLICY "Property owners can update salesforce settings"
  ON public.salesforce_settings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = salesforce_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Property owners can delete salesforce settings" ON public.salesforce_settings;
CREATE POLICY "Property owners can delete salesforce settings"
  ON public.salesforce_settings FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = salesforce_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

-- Salesforce exports
DROP POLICY IF EXISTS "Property owners can view salesforce exports" ON public.salesforce_exports;
CREATE POLICY "Property owners can view salesforce exports"
  ON public.salesforce_exports FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.properties p ON p.id = c.property_id
    WHERE c.id = salesforce_exports.conversation_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Property owners can insert salesforce exports" ON public.salesforce_exports;
CREATE POLICY "Property owners can insert salesforce exports"
  ON public.salesforce_exports FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.properties p ON p.id = c.property_id
    WHERE c.id = salesforce_exports.conversation_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

-- Notification logs
DROP POLICY IF EXISTS "Property owners can view notification logs" ON public.notification_logs;
CREATE POLICY "Property owners can view notification logs"
  ON public.notification_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = notification_logs.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

-- PHI audit logs
DROP POLICY IF EXISTS "Property owners can view their audit logs" ON public.phi_audit_logs;
CREATE POLICY "Property owners can view their audit logs"
  ON public.phi_audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = phi_audit_logs.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

-- Page analytics
DROP POLICY IF EXISTS "Property owners can view page analytics" ON public.page_analytics_events;
CREATE POLICY "Property owners can view page analytics"
  ON public.page_analytics_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = page_analytics_events.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

-- Video call signals
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'video_call_signals') THEN
    DROP POLICY IF EXISTS "Property owners can view video signals" ON public.video_call_signals;
    EXECUTE $p$
      CREATE POLICY "Property owners can view video signals"
        ON public.video_call_signals FOR SELECT
        USING (EXISTS (
          SELECT 1 FROM public.conversations c
          JOIN public.properties p ON p.id = c.property_id
          WHERE c.id = video_call_signals.conversation_id
          AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
        ))
    $p$;
  END IF;
END $$;

-- Data retention settings
DROP POLICY IF EXISTS "Property owners can manage retention settings" ON public.data_retention_settings;
CREATE POLICY "Property owners can manage retention settings"
  ON public.data_retention_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = data_retention_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Property owners can insert retention settings" ON public.data_retention_settings;
CREATE POLICY "Property owners can insert retention settings"
  ON public.data_retention_settings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = data_retention_settings.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

-- AI agents
DROP POLICY IF EXISTS "Users can view their own AI agents" ON public.ai_agents;
CREATE POLICY "Users can view their own AI agents"
  ON public.ai_agents FOR SELECT
  USING (owner_id IN (SELECT public.get_account_owner_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can create their own AI agents" ON public.ai_agents;
CREATE POLICY "Users can create their own AI agents"
  ON public.ai_agents FOR INSERT
  WITH CHECK (owner_id IN (SELECT public.get_account_owner_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can update their own AI agents" ON public.ai_agents;
CREATE POLICY "Users can update their own AI agents"
  ON public.ai_agents FOR UPDATE
  USING (owner_id IN (SELECT public.get_account_owner_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can delete their own AI agents" ON public.ai_agents;
CREATE POLICY "Users can delete their own AI agents"
  ON public.ai_agents FOR DELETE
  USING (owner_id IN (SELECT public.get_account_owner_ids(auth.uid())));

-- AI agent properties
DROP POLICY IF EXISTS "Users can view their AI agent properties" ON public.ai_agent_properties;
CREATE POLICY "Users can view their AI agent properties"
  ON public.ai_agent_properties FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_agents a
    WHERE a.id = ai_agent_properties.ai_agent_id
    AND a.owner_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can assign properties to their AI agents" ON public.ai_agent_properties;
CREATE POLICY "Users can assign properties to their AI agents"
  ON public.ai_agent_properties FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_agents a
    WHERE a.id = ai_agent_properties.ai_agent_id
    AND a.owner_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can remove property assignments from their AI agents" ON public.ai_agent_properties;
CREATE POLICY "Users can remove property assignments from their AI agents"
  ON public.ai_agent_properties FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ai_agents a
    WHERE a.id = ai_agent_properties.ai_agent_id
    AND a.owner_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

-- Property agents (owner side)
DROP POLICY IF EXISTS "Property owners can manage agents" ON public.property_agents;
CREATE POLICY "Property owners can manage agents"
  ON public.property_agents FOR ALL
  USING (user_owns_property(property_id, auth.uid()));

-- Agent complaints (property owner side)
DROP POLICY IF EXISTS "Property owners can view complaints" ON public.agent_complaints;
CREATE POLICY "Property owners can view complaints"
  ON public.agent_complaints FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = agent_complaints.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Property owners can update complaints" ON public.agent_complaints;
CREATE POLICY "Property owners can update complaints"
  ON public.agent_complaints FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = agent_complaints.property_id
    AND p.user_id IN (SELECT public.get_account_owner_ids(auth.uid()))
  ));

-- Profiles: co-owners should be able to view each other's profiles
CREATE POLICY "Co-owners can view owner profiles"
  ON public.profiles FOR SELECT
  USING (user_id IN (SELECT public.get_account_owner_ids(auth.uid())));

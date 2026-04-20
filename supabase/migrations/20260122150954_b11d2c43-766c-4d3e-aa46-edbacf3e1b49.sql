-- =============================================
-- SECURITY HARDENING MIGRATION
-- =============================================

-- 1. Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can update visitors" ON public.visitors;
DROP POLICY IF EXISTS "Anyone can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can read signals for their conversations" ON public.video_call_signals;

-- 2. Create a helper function to validate property exists (for widget inserts)
CREATE OR REPLACE FUNCTION public.property_exists(property_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties WHERE id = property_uuid
  )
$$;

-- 3. Create a helper function to validate visitor owns session
CREATE OR REPLACE FUNCTION public.visitor_matches_session(visitor_uuid uuid, visitor_session_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.visitors 
    WHERE id = visitor_uuid AND session_id = visitor_session_id
  )
$$;

-- 4. Tighten visitors INSERT - require valid property
DROP POLICY IF EXISTS "Anyone can create visitors" ON public.visitors;
CREATE POLICY "Widget can create visitors for valid properties"
ON public.visitors
FOR INSERT
WITH CHECK (public.property_exists(property_id));

-- 5. Add restricted visitor UPDATE - only property owners and agents can update
-- (Widget updates will go through edge functions with service role)
CREATE POLICY "Property owners can update visitors"
ON public.visitors
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM properties p
  WHERE p.id = visitors.property_id AND p.user_id = auth.uid()
));

CREATE POLICY "Assigned agents can update visitors"
ON public.visitors
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM property_agents pa
  JOIN agents a ON a.id = pa.agent_id
  WHERE pa.property_id = visitors.property_id AND a.user_id = auth.uid()
));

-- 6. Tighten conversations INSERT - require valid property
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;
CREATE POLICY "Widget can create conversations for valid properties"
ON public.conversations
FOR INSERT
WITH CHECK (public.property_exists(property_id));

-- 7. Tighten messages INSERT - require valid conversation
DROP POLICY IF EXISTS "Assigned agents can insert messages" ON public.messages;

CREATE OR REPLACE FUNCTION public.conversation_exists(conv_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations WHERE id = conv_uuid
  )
$$;

CREATE POLICY "Anyone can create messages for valid conversations"
ON public.messages
FOR INSERT
WITH CHECK (public.conversation_exists(conversation_id));

CREATE POLICY "Assigned agents can insert messages"
ON public.messages
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM conversations c
  JOIN property_agents pa ON pa.property_id = c.property_id
  JOIN agents a ON a.id = pa.agent_id
  WHERE c.id = messages.conversation_id AND a.user_id = auth.uid()
));

-- 8. Tighten video_call_signals - require valid conversation and restrict SELECT
DROP POLICY IF EXISTS "Users can insert signals" ON public.video_call_signals;

CREATE POLICY "Anyone can insert signals for valid conversations"
ON public.video_call_signals
FOR INSERT
WITH CHECK (public.conversation_exists(conversation_id));

CREATE POLICY "Property owners can view video signals"
ON public.video_call_signals
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM conversations c
  JOIN properties p ON p.id = c.property_id
  WHERE c.id = video_call_signals.conversation_id AND p.user_id = auth.uid()
));

CREATE POLICY "Assigned agents can view video signals"
ON public.video_call_signals
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM conversations c
  JOIN property_agents pa ON pa.property_id = c.property_id
  JOIN agents a ON a.id = pa.agent_id
  WHERE c.id = video_call_signals.conversation_id AND a.user_id = auth.uid()
));

-- 9. Tighten page_analytics_events - require valid property
DROP POLICY IF EXISTS "Anyone can insert page analytics events" ON public.page_analytics_events;
CREATE POLICY "Widget can insert analytics for valid properties"
ON public.page_analytics_events
FOR INSERT
WITH CHECK (public.property_exists(property_id));
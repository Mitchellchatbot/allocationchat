-- The two-branch OR messages RLS policy was too slow for agents with many properties:
-- each message row ran two complex EXISTS subqueries with full RLS chain evaluation.
-- Replace with a single SECURITY DEFINER function that does one fast index lookup.

CREATE OR REPLACE FUNCTION public.user_can_access_message(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conv_id
    AND user_is_agent_for_property(c.property_id, auth.uid())
  );
$$;

DROP POLICY IF EXISTS "Assigned agents can view their conversation messages" ON public.messages;
DROP POLICY IF EXISTS "Assigned agents can insert their conversation messages" ON public.messages;
DROP POLICY IF EXISTS "Assigned agents can update their conversation messages" ON public.messages;

CREATE POLICY "Agents can view messages on their properties"
ON public.messages FOR SELECT
USING (user_can_access_message(conversation_id));

CREATE POLICY "Agents can insert messages on their properties"
ON public.messages FOR INSERT
WITH CHECK (user_can_access_message(conversation_id));

CREATE POLICY "Agents can update messages on their properties"
ON public.messages FOR UPDATE
USING (user_can_access_message(conversation_id));

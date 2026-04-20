
-- Fix: Agents should only see messages for conversations assigned to them or unassigned conversations

-- Drop existing overprivileged agent policies on messages
DROP POLICY IF EXISTS "Assigned agents can view messages" ON public.messages;
DROP POLICY IF EXISTS "Assigned agents can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Assigned agents can update messages" ON public.messages;

-- Recreate with proper scoping: agents can only see messages for their assigned conversations OR unassigned ones
CREATE POLICY "Assigned agents can view their conversation messages"
ON public.messages FOR SELECT
USING (
  -- Agent is specifically assigned to this conversation
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.agents a ON a.id = c.assigned_agent_id
    WHERE c.id = messages.conversation_id
    AND a.user_id = auth.uid()
  )
  OR
  -- Unassigned conversations on properties where agent works
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.property_agents pa ON pa.property_id = c.property_id
    JOIN public.agents a ON a.id = pa.agent_id
    WHERE c.id = messages.conversation_id
    AND c.assigned_agent_id IS NULL
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Assigned agents can insert their conversation messages"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.agents a ON a.id = c.assigned_agent_id
    WHERE c.id = messages.conversation_id
    AND a.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.property_agents pa ON pa.property_id = c.property_id
    JOIN public.agents a ON a.id = pa.agent_id
    WHERE c.id = messages.conversation_id
    AND c.assigned_agent_id IS NULL
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Assigned agents can update their conversation messages"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.agents a ON a.id = c.assigned_agent_id
    WHERE c.id = messages.conversation_id
    AND a.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.property_agents pa ON pa.property_id = c.property_id
    JOIN public.agents a ON a.id = pa.agent_id
    WHERE c.id = messages.conversation_id
    AND c.assigned_agent_id IS NULL
    AND a.user_id = auth.uid()
  )
);

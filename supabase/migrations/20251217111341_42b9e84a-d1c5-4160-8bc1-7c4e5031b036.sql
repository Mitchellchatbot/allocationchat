-- Migrate existing 'user' roles to 'client'
UPDATE user_roles SET role = 'client' WHERE role = 'user';

-- Add invited_by and invitation_status columns to agents table
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS invitation_status text DEFAULT 'accepted' CHECK (invitation_status IN ('pending', 'accepted', 'revoked'));

-- Create unique constraint on user_id in agents table (one agent profile per user)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agents_user_id_unique'
  ) THEN
    ALTER TABLE public.agents ADD CONSTRAINT agents_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- RLS: Clients can view agents they invited
CREATE POLICY "Clients can view agents they invited"
ON public.agents
FOR SELECT
USING (invited_by = auth.uid());

-- RLS: Clients can manage (insert/update/delete) agents they invited
CREATE POLICY "Clients can manage agents they invited"
ON public.agents
FOR ALL
USING (invited_by = auth.uid());

-- RLS: Admins can view all agents
CREATE POLICY "Admins can view all agents"
ON public.agents
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- RLS: Admins can manage all agents
CREATE POLICY "Admins can manage all agents"
ON public.agents
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Update conversations RLS for agents to view only assigned property conversations
DROP POLICY IF EXISTS "Assigned agents can view conversations" ON public.conversations;
CREATE POLICY "Assigned agents can view conversations"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM property_agents pa
    JOIN agents a ON a.id = pa.agent_id
    WHERE pa.property_id = conversations.property_id
    AND a.user_id = auth.uid()
  )
);

-- Agents can update conversations they're assigned to
DROP POLICY IF EXISTS "Assigned agents can update conversations" ON public.conversations;
CREATE POLICY "Assigned agents can update conversations"
ON public.conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM property_agents pa
    JOIN agents a ON a.id = pa.agent_id
    WHERE pa.property_id = conversations.property_id
    AND a.user_id = auth.uid()
  )
);

-- Update messages RLS for agents
DROP POLICY IF EXISTS "Assigned agents can view messages" ON public.messages;
CREATE POLICY "Assigned agents can view messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN property_agents pa ON pa.property_id = c.property_id
    JOIN agents a ON a.id = pa.agent_id
    WHERE c.id = messages.conversation_id
    AND a.user_id = auth.uid()
  )
);

-- Agents can insert messages for their assigned conversations
CREATE POLICY "Assigned agents can insert messages"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN property_agents pa ON pa.property_id = c.property_id
    JOIN agents a ON a.id = pa.agent_id
    WHERE c.id = conversation_id
    AND a.user_id = auth.uid()
  )
);

-- Agents can update messages for their assigned conversations
CREATE POLICY "Assigned agents can update messages"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN property_agents pa ON pa.property_id = c.property_id
    JOIN agents a ON a.id = pa.agent_id
    WHERE c.id = messages.conversation_id
    AND a.user_id = auth.uid()
  )
);

-- Update visitors RLS for agents
DROP POLICY IF EXISTS "Assigned agents can view visitors" ON public.visitors;
CREATE POLICY "Assigned agents can view visitors"
ON public.visitors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM property_agents pa
    JOIN agents a ON a.id = pa.agent_id
    WHERE pa.property_id = visitors.property_id
    AND a.user_id = auth.uid()
  )
);
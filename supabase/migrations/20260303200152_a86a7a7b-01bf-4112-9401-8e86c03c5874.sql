
-- Create agent complaints table
CREATE TABLE public.agent_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_complaints ENABLE ROW LEVEL SECURITY;

-- Agents can insert their own complaints
CREATE POLICY "Agents can submit complaints"
ON public.agent_complaints
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = agent_complaints.agent_id
    AND a.user_id = auth.uid()
  )
);

-- Agents can view their own complaints
CREATE POLICY "Agents can view their own complaints"
ON public.agent_complaints
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = agent_complaints.agent_id
    AND a.user_id = auth.uid()
  )
);

-- Property owners can view complaints for their properties
CREATE POLICY "Property owners can view complaints"
ON public.agent_complaints
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = agent_complaints.property_id
    AND p.user_id = auth.uid()
  )
);

-- Property owners can update complaint status
CREATE POLICY "Property owners can update complaints"
ON public.agent_complaints
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = agent_complaints.property_id
    AND p.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_agent_complaints_updated_at
BEFORE UPDATE ON public.agent_complaints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add linked_agent_id to ai_agents table to link AI personas to human agents
ALTER TABLE public.ai_agents 
ADD COLUMN linked_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX idx_ai_agents_linked_agent ON public.ai_agents(linked_agent_id);

-- Add comment for clarity
COMMENT ON COLUMN public.ai_agents.linked_agent_id IS 'Links this AI agent to a human team member for shared name/avatar';
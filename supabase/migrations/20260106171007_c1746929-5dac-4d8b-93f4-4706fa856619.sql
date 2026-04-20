-- Create AI agents table
CREATE TABLE public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  personality_prompt TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own AI agents"
ON public.ai_agents
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own AI agents"
ON public.ai_agents
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own AI agents"
ON public.ai_agents
FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own AI agents"
ON public.ai_agents
FOR DELETE
USING (auth.uid() = owner_id);

-- Add trigger for updated_at
CREATE TRIGGER update_ai_agents_updated_at
BEFORE UPDATE ON public.ai_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add avatar_url column to existing agents table for human agents
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create AI agent property assignments table
CREATE TABLE public.ai_agent_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ai_agent_id, property_id)
);

-- Enable RLS on ai_agent_properties
ALTER TABLE public.ai_agent_properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_agent_properties
CREATE POLICY "Users can view their AI agent properties"
ON public.ai_agent_properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ai_agents 
    WHERE ai_agents.id = ai_agent_properties.ai_agent_id 
    AND ai_agents.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can assign properties to their AI agents"
ON public.ai_agent_properties
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ai_agents 
    WHERE ai_agents.id = ai_agent_properties.ai_agent_id 
    AND ai_agents.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can remove property assignments from their AI agents"
ON public.ai_agent_properties
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ai_agents 
    WHERE ai_agents.id = ai_agent_properties.ai_agent_id 
    AND ai_agents.owner_id = auth.uid()
  )
);
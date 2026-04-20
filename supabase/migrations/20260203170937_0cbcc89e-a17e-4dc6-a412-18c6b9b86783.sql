-- Drop the problematic policies that cause circular recursion
DROP POLICY IF EXISTS "Assigned agents can view properties" ON public.properties;
DROP POLICY IF EXISTS "Property owners can manage agents" ON public.property_agents;
DROP POLICY IF EXISTS "Agents can view their assignments" ON public.property_agents;

-- Create a SECURITY DEFINER function to check if user owns a property (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_owns_property(property_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = property_uuid AND user_id = user_uuid
  );
$$;

-- Create a SECURITY DEFINER function to check if user is an agent for a property (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_is_agent_for_property(property_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.property_agents pa
    JOIN public.agents a ON a.id = pa.agent_id
    WHERE pa.property_id = property_uuid 
    AND a.user_id = user_uuid
  );
$$;

-- Recreate policies using the SECURITY DEFINER functions to avoid recursion

-- Properties: Agents can view properties they're assigned to
CREATE POLICY "Assigned agents can view properties" 
ON public.properties 
FOR SELECT 
USING (user_is_agent_for_property(id, auth.uid()));

-- Property agents: Owners can manage agents (using function to avoid recursion)
CREATE POLICY "Property owners can manage agents" 
ON public.property_agents 
FOR ALL 
USING (user_owns_property(property_id, auth.uid()));

-- Property agents: Agents can view their own assignments
CREATE POLICY "Agents can view their assignments" 
ON public.property_agents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = property_agents.agent_id 
    AND a.user_id = auth.uid()
  )
);
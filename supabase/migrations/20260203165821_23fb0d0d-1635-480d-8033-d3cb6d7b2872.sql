-- Add RLS policy for agents to view properties they're assigned to
CREATE POLICY "Assigned agents can view properties" 
ON public.properties 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM property_agents pa
    JOIN agents a ON a.id = pa.agent_id
    WHERE pa.property_id = properties.id 
    AND a.user_id = auth.uid()
  )
);
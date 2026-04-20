
-- Fix overly permissive WITH CHECK on the queue update policy
DROP POLICY IF EXISTS "Property owners can update ai queue state" ON public.conversations;

CREATE POLICY "Property owners can update ai queue state"
ON public.conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = conversations.property_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = conversations.property_id AND p.user_id = auth.uid()
  )
);

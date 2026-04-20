-- Add delete policy for conversations (property owners can delete)
CREATE POLICY "Property owners can delete conversations" 
ON public.conversations 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM properties p
  WHERE p.id = conversations.property_id AND p.user_id = auth.uid()
));
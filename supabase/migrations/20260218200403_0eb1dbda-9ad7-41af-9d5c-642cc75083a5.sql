
-- Add AI queue signaling columns to conversations table
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS ai_queued_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_queued_preview TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_queued_paused BOOLEAN DEFAULT FALSE;

-- Allow widget (anon) to update these columns via the edge functions
-- The existing "Widget can create conversations for valid properties" INSERT policy covers creation.
-- We need UPDATE for queue signaling. We'll do it via edge function (service role) so no client-side RLS needed.

-- Allow property owners to update queue state too (so dashboard can pause/cancel)
CREATE POLICY "Property owners can update ai queue state"
ON public.conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = conversations.property_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (TRUE);

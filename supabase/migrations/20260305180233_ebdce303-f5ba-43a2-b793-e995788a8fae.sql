
-- Security definer function to check if a visitor owns a conversation
CREATE OR REPLACE FUNCTION public.visitor_owns_conversation(conv_id uuid, visitor_session text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.conversations c
    JOIN public.visitors v ON v.id = c.visitor_id
    WHERE c.id = conv_id 
    AND v.session_id = visitor_session
  )
$$;

-- Allow anon (widget) to read messages for existing conversations via Realtime
CREATE POLICY "Widget can read messages for valid conversations"
ON public.messages FOR SELECT TO anon
USING (conversation_exists(conversation_id));

-- Allow anon (widget) to read conversation state for Realtime queue monitoring
CREATE POLICY "Widget can read valid conversations"
ON public.conversations FOR SELECT TO anon
USING (true);

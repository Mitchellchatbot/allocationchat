
CREATE OR REPLACE FUNCTION public.admin_conversation_messages(p_conversation_id uuid)
RETURNS TABLE(
  message_id uuid,
  sender_id text,
  sender_type text,
  content text,
  created_at timestamptz,
  read boolean,
  sequence_number integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    m.id AS message_id,
    m.sender_id,
    m.sender_type,
    m.content,
    m.created_at,
    m.read,
    m.sequence_number
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.sequence_number ASC, m.created_at ASC;
$$;

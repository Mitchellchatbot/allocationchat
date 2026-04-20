-- Lightweight RPC to replace the widget-conversation-presence Edge Function.
-- Validates visitor ownership via session_id, then touches updated_at & status.
CREATE OR REPLACE FUNCTION public.touch_conversation_presence(
  p_visitor_id uuid,
  p_session_id text,
  p_status text DEFAULT 'active'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conv_id uuid;
  v_current_status text;
  v_valid boolean;
BEGIN
  -- Validate visitor owns this session
  SELECT EXISTS (
    SELECT 1 FROM public.visitors
    WHERE id = p_visitor_id AND session_id = p_session_id
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  -- Find the most recent conversation for this visitor
  SELECT id, status INTO v_conv_id, v_current_status
  FROM public.conversations
  WHERE visitor_id = p_visitor_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'updated', false);
  END IF;

  -- For 'closed' requests, skip if already closed
  IF p_status = 'closed' AND v_current_status = 'closed' THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'status', 'closed');
  END IF;

  -- Update conversation
  UPDATE public.conversations
  SET status = p_status, updated_at = now()
  WHERE id = v_conv_id;

  RETURN jsonb_build_object('ok', true, 'updated', true, 'conversationId', v_conv_id, 'status', p_status);
END;
$$;

-- Allow anon role to call this function (widget runs unauthenticated)
GRANT EXECUTE ON FUNCTION public.touch_conversation_presence(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.touch_conversation_presence(uuid, text, text) TO authenticated;
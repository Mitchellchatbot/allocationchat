
-- Allow unauthenticated users to look up pending invitations by token
CREATE POLICY "Anyone can look up pending invitations by token"
ON public.agents
FOR SELECT
USING (
  invitation_status = 'pending'
  AND invitation_token IS NOT NULL
);

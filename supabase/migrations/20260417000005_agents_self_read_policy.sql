-- Agents could not see conversations because the conversations RLS policy
-- does a JOIN on agents (to check user_id = auth.uid()), but there was no
-- policy allowing agents to read their own row in the agents table.
-- Without this, the JOIN returns nothing and agents see zero conversations.
CREATE POLICY "Agents can view their own profile"
  ON public.agents FOR SELECT
  USING (user_id = auth.uid());

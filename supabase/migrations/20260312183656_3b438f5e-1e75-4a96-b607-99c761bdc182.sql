
CREATE POLICY "Owners can view co-owner profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_co_owners
    WHERE owner_user_id = auth.uid()
    AND co_owner_user_id = profiles.user_id
  )
);

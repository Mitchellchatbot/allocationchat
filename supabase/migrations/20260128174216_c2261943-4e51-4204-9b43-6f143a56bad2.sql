-- Drop the existing restrictive INSERT policy for visitors
DROP POLICY IF EXISTS "Widget can create visitors for valid properties" ON public.visitors;

-- Create a new PERMISSIVE INSERT policy for visitors
CREATE POLICY "Widget can create visitors for valid properties"
ON public.visitors
FOR INSERT
TO anon, authenticated
WITH CHECK (property_exists(property_id));
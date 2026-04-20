-- Drop the restrictive policy that's blocking widget inserts
DROP POLICY IF EXISTS "Widget can create visitors for valid properties" ON public.visitors;

-- Create a proper PERMISSIVE policy that allows widget to create visitors
CREATE POLICY "Widget can create visitors for valid properties" 
ON public.visitors 
FOR INSERT 
TO anon, authenticated
WITH CHECK (property_exists(property_id));

-- Also need to fix conversations - check if it has the same issue
DROP POLICY IF EXISTS "Widget can create conversations for valid properties" ON public.conversations;

CREATE POLICY "Widget can create conversations for valid properties" 
ON public.conversations 
FOR INSERT 
TO anon, authenticated
WITH CHECK (property_exists(property_id));

-- Fix messages policy too
DROP POLICY IF EXISTS "Anyone can create messages for valid conversations" ON public.messages;

CREATE POLICY "Anyone can create messages for valid conversations" 
ON public.messages 
FOR INSERT 
TO anon, authenticated
WITH CHECK (conversation_exists(conversation_id));
-- Enable realtime for visitors table
ALTER TABLE public.visitors REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitors;
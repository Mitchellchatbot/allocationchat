-- Create page_analytics_events table for tracking chatbot interactions
CREATE TABLE public.page_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url text NOT NULL,
  page_title text,
  event_type text NOT NULL CHECK (event_type IN ('chat_open', 'human_escalation')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient time-based queries
CREATE INDEX idx_page_analytics_events_property_time 
ON public.page_analytics_events(property_id, created_at DESC);

CREATE INDEX idx_page_analytics_events_type 
ON public.page_analytics_events(event_type);

CREATE INDEX idx_page_analytics_events_url 
ON public.page_analytics_events(url);

-- Enable RLS
ALTER TABLE public.page_analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS: Property owners can view their analytics
CREATE POLICY "Property owners can view page analytics"
ON public.page_analytics_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = page_analytics_events.property_id
    AND p.user_id = auth.uid()
  )
);

-- RLS: Anyone can insert analytics events (from widget)
CREATE POLICY "Anyone can insert page analytics events"
ON public.page_analytics_events
FOR INSERT
WITH CHECK (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_analytics_events;
-- Persistent Salesforce export queue with retry logic.
-- Every lead that needs to reach Salesforce gets a row here.
-- The queue is never silently cleared — only marked success or abandoned.

CREATE TABLE public.salesforce_export_queue (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  visitor_id        UUID        NOT NULL,
  conversation_id   UUID,
  trigger_type      TEXT        NOT NULL DEFAULT 'phone', -- 'phone' | 'insurance' | 'manual'
  status            TEXT        NOT NULL DEFAULT 'pending', -- 'pending' | 'success' | 'failed' | 'abandoned'
  attempts          INT         NOT NULL DEFAULT 0,
  max_attempts      INT         NOT NULL DEFAULT 5,
  next_attempt_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempted_at TIMESTAMPTZ,
  last_error        TEXT,
  salesforce_lead_id TEXT,
  exported_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup for the retry processor
CREATE INDEX idx_sfq_due ON public.salesforce_export_queue (next_attempt_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX idx_sfq_property ON public.salesforce_export_queue (property_id);

-- One active queue entry per visitor per trigger type
-- (prevents duplicates from belt+suspenders enqueue paths)
CREATE UNIQUE INDEX idx_sfq_visitor_trigger_active
  ON public.salesforce_export_queue (visitor_id, trigger_type)
  WHERE status NOT IN ('success', 'abandoned');

ALTER TABLE public.salesforce_export_queue ENABLE ROW LEVEL SECURITY;
-- Only accessed via service role — no user-facing policies needed.

GRANT ALL ON TABLE public.salesforce_export_queue TO service_role;
GRANT ALL ON TABLE public.salesforce_export_queue TO authenticated;

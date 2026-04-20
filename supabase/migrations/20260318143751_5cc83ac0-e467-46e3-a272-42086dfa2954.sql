
CREATE TABLE public.health_check_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  test_name text NOT NULL,
  category text NOT NULL,
  status text NOT NULL,
  latency_ms integer NOT NULL DEFAULT 0,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_check_results_run_id ON public.health_check_results(run_id);
CREATE INDEX idx_health_check_results_created_at ON public.health_check_results(created_at DESC);

ALTER TABLE public.health_check_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.health_check_results
  FOR ALL TO service_role USING (true) WITH CHECK (true);

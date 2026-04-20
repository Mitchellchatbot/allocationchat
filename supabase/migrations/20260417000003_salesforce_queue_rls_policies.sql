-- Allow property owners to insert and read their own queue entries.
-- The queue table has RLS enabled; without these policies authenticated
-- users (client JWT) get a 403 when the frontend enqueues export jobs.

CREATE POLICY "Property owners can insert salesforce export queue"
  ON public.salesforce_export_queue
  FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can view salesforce export queue"
  ON public.salesforce_export_queue
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can update salesforce export queue"
  ON public.salesforce_export_queue
  FOR UPDATE
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE user_id = auth.uid()
    )
  );

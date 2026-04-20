-- ── salesforce_orgs ──────────────────────────────────────────────────────────
-- One row per Salesforce org per account. Multiple properties on the same
-- account that connect to the same Salesforce instance share one row here,
-- eliminating duplicate token storage and redundant token refresh calls.

CREATE TABLE public.salesforce_orgs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_url      TEXT        NOT NULL,
  access_token      TEXT,                    -- AES-256-GCM encrypted: enc:{iv}:{ct}
  refresh_token     TEXT,                    -- AES-256-GCM encrypted
  token_expires_at  TIMESTAMPTZ,
  client_id         TEXT,                    -- Connected App consumer key (if user-supplied)
  client_secret     TEXT,                    -- Connected App consumer secret (if user-supplied)
  login_url         TEXT        DEFAULT 'https://login.salesforce.com',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, instance_url)
);

CREATE TRIGGER update_salesforce_orgs_updated_at
  BEFORE UPDATE ON public.salesforce_orgs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.salesforce_orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own salesforce orgs"
  ON public.salesforce_orgs FOR SELECT
  USING (user_id IN (SELECT public.get_account_owner_ids(auth.uid())));

CREATE POLICY "Users can insert their own salesforce orgs"
  ON public.salesforce_orgs FOR INSERT
  WITH CHECK (user_id IN (SELECT public.get_account_owner_ids(auth.uid())));

CREATE POLICY "Users can update their own salesforce orgs"
  ON public.salesforce_orgs FOR UPDATE
  USING (user_id IN (SELECT public.get_account_owner_ids(auth.uid())));

-- ── Link salesforce_settings to salesforce_orgs ───────────────────────────────
ALTER TABLE public.salesforce_settings
  ADD COLUMN salesforce_org_id UUID REFERENCES public.salesforce_orgs(id) ON DELETE SET NULL;

-- ── Data migration ─────────────────────────────────────────────────────────────
-- Step 1: Create one salesforce_orgs row per (user_id, instance_url) pair.
-- For orgs shared across properties, pick tokens from the most-recently-updated row.
INSERT INTO public.salesforce_orgs (
  user_id, instance_url, access_token, refresh_token,
  token_expires_at, client_id, client_secret, login_url
)
SELECT DISTINCT ON (p.user_id, ss.instance_url)
  p.user_id,
  ss.instance_url,
  ss.access_token,
  ss.refresh_token,
  ss.token_expires_at,
  ss.client_id,
  ss.client_secret,
  COALESCE(ss.login_url, 'https://login.salesforce.com')
FROM public.salesforce_settings ss
JOIN public.properties p ON p.id = ss.property_id
WHERE ss.instance_url IS NOT NULL
  AND ss.access_token IS NOT NULL
ORDER BY p.user_id, ss.instance_url, ss.updated_at DESC;

-- Step 2: Link each salesforce_settings row to its salesforce_orgs row.
UPDATE public.salesforce_settings ss
SET salesforce_org_id = so.id
FROM public.salesforce_orgs so
JOIN public.properties p ON p.user_id = so.user_id
WHERE ss.property_id = p.id
  AND ss.instance_url = so.instance_url;

-- Note: token columns (access_token, refresh_token, etc.) are intentionally kept
-- on salesforce_settings for now as a safe rollback mechanism. They will be
-- dropped in a future migration once the new schema is verified in production.

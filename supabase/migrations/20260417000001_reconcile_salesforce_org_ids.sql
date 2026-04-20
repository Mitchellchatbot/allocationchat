-- Back-fill salesforce_org_id for any salesforce_settings rows that share an
-- instance_url with an existing salesforce_orgs row owned by the same user.
-- Safe to run multiple times — only updates rows where salesforce_org_id is wrong or missing.
UPDATE public.salesforce_settings ss
SET salesforce_org_id = so.id,
    updated_at = now()
FROM public.salesforce_orgs so
JOIN public.properties p ON p.user_id = so.user_id
WHERE ss.property_id = p.id
  AND ss.salesforce_org_id IS DISTINCT FROM so.id
  AND LOWER(RTRIM(ss.instance_url, '/')) = LOWER(RTRIM(so.instance_url, '/'));

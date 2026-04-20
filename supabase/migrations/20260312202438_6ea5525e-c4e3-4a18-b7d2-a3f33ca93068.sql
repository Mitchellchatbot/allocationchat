
CREATE OR REPLACE FUNCTION public.admin_client_overview()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  company_name text,
  created_at timestamptz,
  properties_count bigint,
  conversations_count bigint,
  agents_count bigint,
  phones_count bigint,
  leads_count bigint,
  complaints_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    p.user_id,
    p.email,
    p.full_name,
    p.company_name,
    p.created_at,
    (SELECT count(*) FROM properties pr WHERE pr.user_id = p.user_id),
    (SELECT count(*) FROM conversations c WHERE c.property_id IN (SELECT id FROM properties pr WHERE pr.user_id = p.user_id)),
    (SELECT count(*) FROM agents a WHERE a.invited_by = p.user_id),
    (SELECT count(*) FROM visitors v WHERE v.property_id IN (SELECT id FROM properties pr WHERE pr.user_id = p.user_id) AND v.phone IS NOT NULL),
    (SELECT count(*) FROM visitors v WHERE v.property_id IN (SELECT id FROM properties pr WHERE pr.user_id = p.user_id) AND (v.name IS NOT NULL OR v.email IS NOT NULL OR v.phone IS NOT NULL)),
    (SELECT count(*) FROM agent_complaints ac WHERE ac.property_id IN (SELECT id FROM properties pr WHERE pr.user_id = p.user_id))
  FROM profiles p
  WHERE p.user_id IN (SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'client')
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_client_details(client_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'properties', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'name', pr.name,
        'domain', pr.domain,
        'conversations_count', (SELECT count(*) FROM conversations c WHERE c.property_id = pr.id)
      ))
      FROM properties pr WHERE pr.user_id = client_user_id
    ), '[]'::jsonb),
    'agents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', a.name,
        'email', a.email,
        'status', a.status
      ))
      FROM agents a WHERE a.invited_by = client_user_id
    ), '[]'::jsonb)
  );
$$;

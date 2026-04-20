-- Admin function to browse all conversations with client/visitor/property info
CREATE OR REPLACE FUNCTION public.admin_conversations_browse(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  conversation_id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  property_name text,
  property_domain text,
  client_email text,
  client_name text,
  visitor_name text,
  visitor_email text,
  visitor_phone text,
  message_count bigint,
  ai_enabled boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.id AS conversation_id,
    c.status,
    c.created_at,
    c.updated_at,
    p.name AS property_name,
    p.domain AS property_domain,
    pr.email AS client_email,
    pr.full_name AS client_name,
    v.name AS visitor_name,
    v.email AS visitor_email,
    v.phone AS visitor_phone,
    (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
    c.ai_enabled
  FROM conversations c
  JOIN properties p ON p.id = c.property_id
  JOIN profiles pr ON pr.user_id = p.user_id
  JOIN visitors v ON v.id = c.visitor_id
  WHERE (p_status IS NULL OR c.status = p_status)
    AND (p_search IS NULL OR 
         v.name ILIKE '%' || p_search || '%' OR 
         v.email ILIKE '%' || p_search || '%' OR
         v.phone ILIKE '%' || p_search || '%' OR
         p.name ILIKE '%' || p_search || '%' OR
         pr.email ILIKE '%' || p_search || '%')
  ORDER BY c.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Admin function for conversation counts by day (last 30 days)
CREATE OR REPLACE FUNCTION public.admin_daily_stats(p_days integer DEFAULT 30)
RETURNS TABLE(
  day date,
  new_conversations bigint,
  leads_captured bigint,
  phones_captured bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    d.day::date,
    COALESCE(conv.cnt, 0) AS new_conversations,
    COALESCE(leads.cnt, 0) AS leads_captured,
    COALESCE(phones.cnt, 0) AS phones_captured
  FROM generate_series(
    (now() - (p_days || ' days')::interval)::date,
    now()::date,
    '1 day'::interval
  ) AS d(day)
  LEFT JOIN (
    SELECT created_at::date AS day, count(*) AS cnt
    FROM conversations
    WHERE created_at >= now() - (p_days || ' days')::interval
    GROUP BY 1
  ) conv ON conv.day = d.day::date
  LEFT JOIN (
    SELECT created_at::date AS day, count(*) AS cnt
    FROM visitors
    WHERE created_at >= now() - (p_days || ' days')::interval
      AND (name IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL)
    GROUP BY 1
  ) leads ON leads.day = d.day::date
  LEFT JOIN (
    SELECT created_at::date AS day, count(*) AS cnt
    FROM visitors
    WHERE created_at >= now() - (p_days || ' days')::interval
      AND phone IS NOT NULL
    GROUP BY 1
  ) phones ON phones.day = d.day::date
  ORDER BY d.day;
$$;
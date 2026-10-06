-- conversations had no index on visitor_id or property_id — only the primary key
-- and a small partial index for the extraction queue. Every lookup that reaches
-- the table by anything other than its id was a sequential scan, which is how a
-- 2,512 row table accumulated 75,000+ of them.
--
-- The dashboard's lead list is the query that finally broke. VisitorLeadsTable
-- selects from visitors with `conversations!inner(property_id)`, and PostgREST
-- runs an embed as a lateral join: one scan of conversations per visitor row.
-- At ~2,100 visitors that is millions of comparisons per page load, and it had
-- grown past the statement timeout, surfacing as "Failed to load leads".
--
-- The same unindexed join sits inside the zoho_exports RLS policy
-- (JOIN conversations c ON c.visitor_id = v.id), so every read of that table
-- paid the same cost.

-- Serves the FK back to visitors: the leads list embed, the zoho_exports RLS
-- policy, and zoho-export-leads' per-visitor conversation lookup.
CREATE INDEX IF NOT EXISTS idx_conversations_visitor_id
  ON public.conversations (visitor_id);

-- Serves filtering a property's conversations, including the inbox and the
-- property_id filter PostgREST pushes into the embed.
CREATE INDEX IF NOT EXISTS idx_conversations_property_id
  ON public.conversations (property_id);

-- ai_agent_id was added without an index in 20261006000000. Unindexed FKs make
-- the ON DELETE SET NULL scan the whole table when a persona is deleted, and the
-- export path looks conversations up by persona.
CREATE INDEX IF NOT EXISTS idx_conversations_ai_agent_id
  ON public.conversations (ai_agent_id)
  WHERE ai_agent_id IS NOT NULL;

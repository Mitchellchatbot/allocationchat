-- Close all stale conversations that have been active/pending for over 1 hour
UPDATE public.conversations 
SET status = 'closed', updated_at = now() 
WHERE status IN ('active', 'pending') 
AND updated_at < now() - interval '1 hour';
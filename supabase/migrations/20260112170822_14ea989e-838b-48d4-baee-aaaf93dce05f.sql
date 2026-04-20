-- Add sequence_number column to messages table
ALTER TABLE public.messages 
ADD COLUMN sequence_number INTEGER;

-- Create index for efficient ordering
CREATE INDEX idx_messages_conversation_sequence 
ON public.messages(conversation_id, sequence_number);

-- Backfill existing messages with sequence numbers based on created_at
WITH numbered_messages AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY conversation_id 
    ORDER BY created_at, id
  ) as seq
  FROM public.messages
)
UPDATE public.messages m
SET sequence_number = nm.seq
FROM numbered_messages nm
WHERE m.id = nm.id;

-- Make sequence_number NOT NULL after backfill
ALTER TABLE public.messages 
ALTER COLUMN sequence_number SET NOT NULL;

-- Set default for new messages
ALTER TABLE public.messages 
ALTER COLUMN sequence_number SET DEFAULT 1;
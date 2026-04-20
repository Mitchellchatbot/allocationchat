-- Add widget behavior settings columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS ai_response_delay_min_ms INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS ai_response_delay_max_ms INTEGER DEFAULT 2500,
ADD COLUMN IF NOT EXISTS typing_indicator_min_ms INTEGER DEFAULT 1500,
ADD COLUMN IF NOT EXISTS typing_indicator_max_ms INTEGER DEFAULT 3000,
ADD COLUMN IF NOT EXISTS max_ai_messages_before_escalation INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS escalation_keywords TEXT[] DEFAULT ARRAY['crisis', 'emergency', 'suicide', 'help me', 'urgent'],
ADD COLUMN IF NOT EXISTS auto_escalation_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS require_email_before_chat BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_name_before_chat BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS proactive_message TEXT,
ADD COLUMN IF NOT EXISTS proactive_message_delay_seconds INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS proactive_message_enabled BOOLEAN DEFAULT false;
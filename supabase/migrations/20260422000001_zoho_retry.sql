-- Track when the Zoho access token expires so we can refresh proactively
ALTER TABLE zoho_connections ADD COLUMN IF NOT EXISTS access_token_expires_at TIMESTAMPTZ;

-- Track retry attempts for queue items so we can apply exponential backoff
ALTER TABLE zoho_export_queue ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;

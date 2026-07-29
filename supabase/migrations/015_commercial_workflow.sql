/*
  015_commercial_workflow.sql
  Extends the commercial jobs table for a full quote → deposit → completion
  workflow, mirroring the residential booking flow.
*/

-- ── 1. Expand status values ────────────────────────────────────────────────
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Migrate legacy 'open' rows before adding the new check
UPDATE jobs SET status = 'pending_review' WHERE status = 'open';

ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN (
    'pending_review', 'quote_sent', 'awaiting_payment',
    'scheduled', 'in_progress', 'completed', 'cancelled'
  ));

ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'pending_review';

-- ── 2. Add payment & quote lifecycle columns ───────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS quote_token_hash                text UNIQUE,
  ADD COLUMN IF NOT EXISTS quote_expires_at                timestamptz,
  ADD COLUMN IF NOT EXISTS quote_sent_at                   timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id              text,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id               text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_deposit_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS deposit_confirmed_at            timestamptz,
  ADD COLUMN IF NOT EXISTS financially_completed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes                     text,
  ADD COLUMN IF NOT EXISTS quoted_at                       timestamptz;

-- ── 3. Allow 'submission' photo kind ──────────────────────────────────────
ALTER TABLE job_photos DROP CONSTRAINT IF EXISTS job_photos_kind_check;
ALTER TABLE job_photos ADD CONSTRAINT job_photos_kind_check
  CHECK (kind IN ('submission', 'before', 'after'));

-- ── 4. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_quote_token_hash
  ON jobs(quote_token_hash) WHERE quote_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_created_at_desc ON jobs(created_at DESC);

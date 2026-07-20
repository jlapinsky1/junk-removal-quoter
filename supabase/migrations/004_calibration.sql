-- Calibration records: owner-approved adjustments based on estimate vs actual learning
CREATE TABLE calibration_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric           TEXT NOT NULL,
  dimension        TEXT NOT NULL,
  dimension_value  TEXT NOT NULL,
  previous_value   NUMERIC,
  suggested_value  NUMERIC,
  approved_value   NUMERIC,
  sample_size      INTEGER NOT NULL DEFAULT 0,
  confidence       TEXT NOT NULL DEFAULT 'weak'
                     CHECK (confidence IN ('weak','strong','very_strong')),
  owner_decision   TEXT NOT NULL DEFAULT 'pending'
                     CHECK (owner_decision IN ('pending','accepted','rejected','deferred')),
  custom_value     NUMERIC,
  settings_version INTEGER,
  supporting_job_ids UUID[] DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT now(),
  decided_at       TIMESTAMPTZ,
  effective_date   DATE,
  notes            TEXT
);

ALTER TABLE calibration_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_calibration" ON calibration_records
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users));

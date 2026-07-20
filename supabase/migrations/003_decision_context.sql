-- Store decision engine output on quote snapshots at approval time
ALTER TABLE quote_snapshots ADD COLUMN decision_context JSONB;

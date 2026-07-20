-- Business goals: one active goal per goal_type at a time
CREATE TABLE business_goals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_type            TEXT NOT NULL CHECK (goal_type IN ('cash_profit','owner_adjusted_profit','revenue')),
  target_amount        NUMERIC(10,2) NOT NULL CHECK (target_amount > 0),
  start_date           DATE NOT NULL,
  end_date             DATE NOT NULL CHECK (end_date > start_date),
  working_days_config  JSONB NOT NULL DEFAULT '{"days":[1,2,3,4,5]}',
  daily_capacity_limit INTEGER DEFAULT 4,
  weekly_target        NUMERIC(10,2),
  minimum_margin       NUMERIC(4,3) DEFAULT 0.55,
  minimum_job_profit   NUMERIC(10,2) DEFAULT 75,
  pipeline_weights     JSONB NOT NULL DEFAULT '{"pending_review":0.15,"quote_sent":0.50,"scheduled":1.0,"completed":1.0}',
  active               BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_one_active_goal_per_type
  ON business_goals (goal_type) WHERE active = true;

-- Auto-update updated_at
CREATE TRIGGER set_business_goals_updated_at
  BEFORE UPDATE ON business_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Daily progress snapshots for historical review
CREATE TABLE goal_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id               UUID NOT NULL REFERENCES business_goals(id),
  snapshot_date         DATE NOT NULL,
  completed_profit      NUMERIC(10,2) NOT NULL DEFAULT 0,
  booked_profit         NUMERIC(10,2) NOT NULL DEFAULT 0,
  pipeline_profit       NUMERIC(10,2) NOT NULL DEFAULT 0,
  pct_achieved          NUMERIC(5,2) NOT NULL DEFAULT 0,
  pace_status           TEXT CHECK (pace_status IN ('achieved','ahead','on_pace','at_risk','behind')),
  jobs_completed        INTEGER NOT NULL DEFAULT 0,
  avg_daily_profit      NUMERIC(10,2),
  required_daily_profit NUMERIC(10,2),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(goal_id, snapshot_date)
);

-- RLS: admin-only
ALTER TABLE business_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_goals" ON business_goals
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM admin_users));
CREATE POLICY "admin_write_goals" ON business_goals
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users));

ALTER TABLE goal_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_goal_snapshots" ON goal_snapshots
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM admin_users));
CREATE POLICY "admin_insert_goal_snapshots" ON goal_snapshots
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

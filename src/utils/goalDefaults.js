export const DEFAULT_PIPELINE_WEIGHTS = {
  pending_review: 0.15,
  quote_sent: 0.50,
  scheduled: 1.0,
  completed: 1.0,
};

export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri (0=Sun)

export const PACE_STATUS_COLORS = {
  achieved: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  ahead: 'text-green-700 bg-green-50 border-green-200',
  on_pace: 'text-blue-700 bg-blue-50 border-blue-200',
  at_risk: 'text-amber-700 bg-amber-50 border-amber-200',
  behind: 'text-red-700 bg-red-50 border-red-200',
};

export const PACE_STATUS_LABELS = {
  achieved: 'Goal Achieved',
  ahead: 'Ahead of Pace',
  on_pace: 'On Pace',
  at_risk: 'At Risk',
  behind: 'Behind',
};

export const GOAL_TYPE_LABELS = {
  cash_profit: 'Cash Profit',
  owner_adjusted_profit: 'Owner-Adjusted Profit',
  revenue: 'Revenue',
};

export const GUARDRAIL_LABELS = {
  minimum_job_profit: 'Absolute Job Profit Floor',
  minimum_margin: 'Absolute Margin Floor',
};

export const ALERT_SEVERITY = {
  success: 'bg-green-50 border-green-200 text-green-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
};

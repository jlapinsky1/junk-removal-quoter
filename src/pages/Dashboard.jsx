import React, { useState, useEffect, useCallback } from 'react';
import { getRepo } from '../utils/repository';
import { calculateGoalProgress, generateAlerts, getTodayProgress, getWeekProgress } from '../utils/goalEngine';
import { PACE_STATUS_COLORS, PACE_STATUS_LABELS, GOAL_TYPE_LABELS, ALERT_SEVERITY, DEFAULT_WORKING_DAYS } from '../utils/goalDefaults';

function formatCurrency(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPct(n) {
  return (Number(n) || 0).toFixed(1) + '%';
}

// ── Goal Setup Form ──

function GoalSetup({ onSave, existingGoal }) {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [form, setForm] = useState({
    goal_type: existingGoal?.goal_type || 'cash_profit',
    target_amount: existingGoal?.target_amount || '',
    start_date: existingGoal?.start_date || firstOfMonth,
    end_date: existingGoal?.end_date || lastOfMonth,
    working_days_config: existingGoal?.working_days_config || { days: [...DEFAULT_WORKING_DAYS] },
    daily_capacity_limit: existingGoal?.daily_capacity_limit || 4,
    minimum_margin: existingGoal?.minimum_margin != null ? (existingGoal.minimum_margin * 100) : 55,
    minimum_job_profit: existingGoal?.minimum_job_profit || 75,
    active: true,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function toggleDay(dayNum) {
    const days = form.working_days_config.days.includes(dayNum)
      ? form.working_days_config.days.filter(d => d !== dayNum)
      : [...form.working_days_config.days, dayNum].sort();
    setForm(f => ({ ...f, working_days_config: { days } }));
  }

  async function handleSave() {
    if (!form.target_amount || Number(form.target_amount) <= 0) return;
    setSaving(true);
    try {
      const repo = await getRepo();
      const goalData = {
        ...(existingGoal?.id ? { id: existingGoal.id } : {}),
        goal_type: form.goal_type,
        target_amount: Number(form.target_amount),
        start_date: form.start_date,
        end_date: form.end_date,
        working_days_config: form.working_days_config,
        daily_capacity_limit: Number(form.daily_capacity_limit) || 4,
        minimum_margin: Number(form.minimum_margin) / 100,
        minimum_job_profit: Number(form.minimum_job_profit) || 75,
        active: true,
      };
      const saved = await repo.upsertGoal(goalData);
      onSave(saved);
    } catch (err) {
      console.error('Failed to save goal:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border p-6 max-w-xl">
      <h2 className="text-lg font-bold mb-4">{existingGoal ? 'Edit Monthly Goal' : 'Set Monthly Goal'}</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Goal Type</label>
          <select
            value={form.goal_type}
            onChange={e => setForm(f => ({ ...f, goal_type: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {Object.entries(GOAL_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount ($)</label>
          <input
            type="number"
            value={form.target_amount}
            onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="15000"
            min="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" value={form.end_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Working Days</label>
          <div className="flex gap-1">
            {dayLabels.map((label, i) => (
              <button key={i} type="button" onClick={() => toggleDay(i)}
                className={`flex-1 py-1.5 text-xs rounded-lg font-medium ${
                  form.working_days_config.days.includes(i)
                    ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >{label}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Margin (%)</label>
            <input type="number" value={form.minimum_margin}
              onChange={e => setForm(f => ({ ...f, minimum_margin: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" min="0" max="100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Job Profit ($)</label>
            <input type="number" value={form.minimum_job_profit}
              onChange={e => setForm(f => ({ ...f, minimum_job_profit: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" min="0" />
          </div>
        </div>

        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-blue-600 hover:underline">
          {showAdvanced ? 'Hide advanced' : 'Show advanced'}
        </button>

        {showAdvanced && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Capacity Limit</label>
            <input type="number" value={form.daily_capacity_limit}
              onChange={e => setForm(f => ({ ...f, daily_capacity_limit: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" min="1" />
          </div>
        )}

        <button onClick={handleSave} disabled={saving || !form.target_amount}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : (existingGoal ? 'Update Goal' : 'Set Goal')}
        </button>
      </div>
    </div>
  );
}

// ── Monthly Scorecard ──

function MonthlyScorecard({ progress, goal }) {
  const paceColor = PACE_STATUS_COLORS[progress.paceStatus] || PACE_STATUS_COLORS.on_pace;
  const paceLabel = PACE_STATUS_LABELS[progress.paceStatus] || 'Unknown';
  const barPct = Math.min(100, progress.pctAchieved);

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Monthly Scorecard</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${paceColor}`}>
          {paceLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{formatPct(progress.pctAchieved)} of target</span>
          <span>{formatCurrency(goal.target_amount)}</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              progress.paceStatus === 'achieved' ? 'bg-emerald-500'
              : progress.paceStatus === 'ahead' ? 'bg-green-500'
              : progress.paceStatus === 'on_pace' ? 'bg-blue-500'
              : progress.paceStatus === 'at_risk' ? 'bg-amber-500'
              : 'bg-red-500'
            }`}
            style={{ width: `${barPct}%` }}
          />
        </div>
        {progress.stretchAmount > 0 && (
          <div className="text-xs text-emerald-600 mt-1">
            {formatCurrency(progress.stretchAmount)} above target
          </div>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Metric label="Completed Profit" value={formatCurrency(progress.completedProfit)} />
        <Metric label="Target" value={formatCurrency(goal.target_amount)} />
        <Metric label="Booked (Scheduled)" value={formatCurrency(progress.bookedProfit)} />
        <Metric label="Pipeline (Weighted)" value={formatCurrency(progress.pipelineProfit)} />
        <Metric label="Committed Projection" value={formatCurrency(progress.committedProjection)} highlight />
        <Metric label="Remaining" value={formatCurrency(progress.remaining)} />
        <Metric label="Avg Daily Profit" value={formatCurrency(progress.avgDailyProfit)} />
        <Metric label="Required Daily" value={formatCurrency(progress.requiredDailyProfit)} />
        <Metric label="Projected EOP" value={formatCurrency(progress.projectedEOP)} />
        <Metric label="Jobs Completed" value={progress.jobsCompleted} />
        <Metric label="Avg Profit/Job" value={formatCurrency(progress.avgProfitPerJob)} />
        <Metric label="Working Days Left" value={progress.workingDaysRemaining} />
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-semibold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

// ── Today View ──

function TodayView({ today }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <h3 className="font-bold text-gray-900 mb-3">Today</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Metric label="Profit Needed Today" value={formatCurrency(today.profitNeededToday)} />
        <Metric label="Completed Today" value={formatCurrency(today.completedProfitToday)} />
        <Metric label="Booked Today" value={formatCurrency(today.bookedProfitToday)} />
        <Metric label="Remaining" value={formatCurrency(today.remainingDaily)} />
        <Metric label="Capacity" value={`${today.capacityBooked} / ${today.capacityLimit} jobs`} />
        <Metric label="Est. Work Hours" value={`${today.estimatedHours}h`} />
        <Metric label="Est. Travel" value={`${today.estimatedTravelMinutes} min`} />
      </div>
    </div>
  );
}

// ── Week View ──

function WeekView({ week }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <h3 className="font-bold text-gray-900 mb-3">This Week</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Metric label="Weekly Target" value={formatCurrency(week.weeklyTarget)} />
        <Metric label="Completed" value={formatCurrency(week.completedThisWeek)} />
        <Metric label="Booked" value={formatCurrency(week.bookedThisWeek)} />
        <Metric label="Remaining" value={formatCurrency(week.remainingWeekly)} />
      </div>
    </div>
  );
}

// ── Alerts Panel ──

function AlertsPanel({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="font-bold text-gray-900">Alerts</h3>
      {alerts.map((alert, i) => (
        <div key={i} className={`rounded-lg border px-4 py-2.5 text-sm ${ALERT_SEVERITY[alert.severity]}`}>
          {alert.message}
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ──

export default function Dashboard() {
  const [goal, setGoal] = useState(null);
  const [goalType, setGoalType] = useState('cash_profit');
  const [progress, setProgress] = useState(null);
  const [today, setToday] = useState(null);
  const [week, setWeek] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const loadDashboard = useCallback(async (activeGoal) => {
    if (!activeGoal) { setLoading(false); return; }
    try {
      const repo = await getRepo();

      const [completed, scheduledRaw, pipeline] = await Promise.all([
        repo.getCompletedBookingsInRange(activeGoal.start_date, activeGoal.end_date),
        repo.getActiveBookingsByStatus(['scheduled']),
        repo.getActiveBookingsByStatus(['pending_review', 'quote_sent']),
      ]);

      const prog = calculateGoalProgress(activeGoal, completed, scheduledRaw, pipeline);
      setProgress(prog);

      // Today's bookings
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayBookings = [...completed, ...scheduledRaw].filter(b => {
        if (b.status === 'completed' && b.completed_at) {
          return b.completed_at.slice(0, 10) === todayStr;
        }
        return false; // We'd need slot_reservations for scheduled date filtering
      });
      // For scheduled today, we use the slot reservations endpoint
      let scheduledToday = [];
      try {
        const todaySlots = await repo.getScheduledBookingsForDateRange(todayStr, todayStr);
        scheduledToday = todaySlots
          .filter(s => s.bookings)
          .map(s => ({ ...s.bookings, status: 'scheduled' }));
      } catch { /* table may not exist yet */ }

      const allToday = [...todayBookings, ...scheduledToday];
      setToday(getTodayProgress(activeGoal, allToday, prog));

      // This week's bookings
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const mondayStr = monday.toISOString().slice(0, 10);
      const sundayStr = sunday.toISOString().slice(0, 10);

      const weekCompleted = completed.filter(b =>
        b.completed_at && b.completed_at.slice(0, 10) >= mondayStr && b.completed_at.slice(0, 10) <= sundayStr
      );
      let weekScheduled = [];
      try {
        const weekSlots = await repo.getScheduledBookingsForDateRange(mondayStr, sundayStr);
        weekScheduled = weekSlots
          .filter(s => s.bookings)
          .map(s => ({ ...s.bookings, status: 'scheduled' }));
      } catch { /* table may not exist yet */ }

      setWeek(getWeekProgress(activeGoal, [...weekCompleted, ...weekScheduled], prog));

      const generatedAlerts = generateAlerts(prog, activeGoal);
      setAlerts(generatedAlerts);

      // Save daily snapshot
      try {
        await repo.saveGoalSnapshot({
          goal_id: activeGoal.id,
          snapshot_date: todayStr,
          completed_profit: prog.completedProfit,
          booked_profit: prog.bookedProfit,
          pipeline_profit: prog.pipelineProfit,
          pct_achieved: prog.pctAchieved,
          pace_status: prog.paceStatus,
          jobs_completed: prog.jobsCompleted,
          avg_daily_profit: prog.avgDailyProfit,
          required_daily_profit: prog.requiredDailyProfit,
        });
      } catch { /* non-critical */ }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const repo = await getRepo();
        const activeGoal = await repo.getActiveGoal(goalType);
        setGoal(activeGoal);
        await loadDashboard(activeGoal);
      } catch (err) {
        console.error('Failed to load goal:', err);
        setLoading(false);
      }
    })();
  }, [goalType, loadDashboard]);

  function handleGoalSaved(savedGoal) {
    setGoal(savedGoal);
    setEditing(false);
    setLoading(true);
    loadDashboard(savedGoal);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!goal || editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Goal & Pace Dashboard</h2>
          {goal && (
            <button onClick={() => setEditing(false)} className="text-sm text-blue-600 hover:underline">
              Cancel
            </button>
          )}
        </div>
        <GoalSetup onSave={handleGoalSaved} existingGoal={goal} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">Goal & Pace Dashboard</h2>
          <div className="flex gap-1">
            {Object.entries(GOAL_TYPE_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => setGoalType(key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  goalType === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >{label}</button>
            ))}
          </div>
        </div>
        <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">
          Edit Goal
        </button>
      </div>

      {progress && (
        <div className="space-y-4">
          <MonthlyScorecard progress={progress} goal={goal} />
          <div className="grid grid-cols-2 gap-4">
            {today && <TodayView today={today} />}
            {week && <WeekView week={week} />}
          </div>
          <AlertsPanel alerts={alerts} />
        </div>
      )}
    </div>
  );
}

import { describe, it, expect } from 'vitest';
import {
  getWorkingDays,
  extractProfit,
  extractExpectedProfit,
  calculatePipelineProfit,
  calculateCommittedProjection,
  determinePaceStatus,
  calculateGoalProgress,
  generateAlerts,
  getTodayProgress,
  getWeekProgress,
} from '../goalEngine';

// ── Helpers ──

function makeGoal(overrides = {}) {
  return {
    goal_type: 'cash_profit',
    target_amount: 15000,
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    working_days_config: { days: [1, 2, 3, 4, 5] },
    daily_capacity_limit: 4,
    weekly_target: null,
    minimum_margin: 0.55,
    minimum_job_profit: 75,
    pipeline_weights: { pending_review: 0.15, quote_sent: 0.50, scheduled: 1.0, completed: 1.0 },
    active: true,
    ...overrides,
  };
}

function makeCompletedBooking(overrides = {}) {
  return {
    id: 'b-1',
    status: 'completed',
    approved_quote: 400,
    actuals: {
      finalAmount: 400,
      disposalCost: 25,
      fuelCost: 15,
      paidLabor: 50,
      ownerLabor: 75,
      paymentFees: 12,
      otherCosts: 0,
    },
    internal_estimate: { recommendedPrice: 400, estimatedProfit: 250, estimatedMargin: 0.75 },
    completed_at: '2026-07-10T14:00:00Z',
    ...overrides,
  };
}

function makeScheduledBooking(overrides = {}) {
  return {
    id: 'b-2',
    status: 'scheduled',
    approved_quote: 350,
    internal_estimate: {
      recommendedPrice: 350,
      disposalAllowance: 25,
      estimatedFuelCost: 12,
      laborAllowance: 50,
      estimatedOnSiteHours: 1.5,
      estimatedTravelMinutes: 45,
    },
    ...overrides,
  };
}

function makePipelineBooking(status = 'pending_review', overrides = {}) {
  return {
    id: 'b-3',
    status,
    approved_quote: 0,
    internal_estimate: {
      recommendedPrice: 300,
      disposalAllowance: 25,
      estimatedFuelCost: 10,
      laborAllowance: 40,
    },
    ...overrides,
  };
}

// ── getWorkingDays ──

describe('getWorkingDays', () => {
  it('counts Mon-Fri in a known week', () => {
    // Mon Jul 7 to Fri Jul 11 2026 = 5 working days
    expect(getWorkingDays('2026-07-07', '2026-07-11', [1, 2, 3, 4, 5])).toBe(5);
  });

  it('excludes weekends with Mon-Fri config', () => {
    // Mon Jul 7 to Sun Jul 13 = 5 working days (Sat+Sun excluded)
    expect(getWorkingDays('2026-07-07', '2026-07-13', [1, 2, 3, 4, 5])).toBe(5);
  });

  it('counts Mon-Sat with 6-day config', () => {
    // Mon Jul 7 to Sun Jul 13 = 6 working days (Mon-Sat, only Sun excluded)
    expect(getWorkingDays('2026-07-07', '2026-07-13', [1, 2, 3, 4, 5, 6])).toBe(6);
  });

  it('handles a single day', () => {
    // Tue Jul 8
    expect(getWorkingDays('2026-07-08', '2026-07-08', [1, 2, 3, 4, 5])).toBe(1);
    // Sat Jul 12 (day 6, not in Mon-Fri config)
    expect(getWorkingDays('2026-07-12', '2026-07-12', [1, 2, 3, 4, 5])).toBe(0);
  });

  it('returns 0 when end < start', () => {
    expect(getWorkingDays('2026-07-10', '2026-07-05', [1, 2, 3, 4, 5])).toBe(0);
  });

  it('counts full month of July 2026 Mon-Fri', () => {
    // July 2026: starts on Wed, 31 days
    // Working days: 23 (July 2026 has 23 weekdays)
    expect(getWorkingDays('2026-07-01', '2026-07-31', [1, 2, 3, 4, 5])).toBe(23);
  });
});

// ── extractProfit ──

describe('extractProfit', () => {
  it('returns cash profit for cash_profit goal type', () => {
    const b = makeCompletedBooking();
    // Cash: 400 - (25+15+50+12+0) = 298
    expect(extractProfit(b, 'cash_profit')).toBe(298);
  });

  it('returns owner-adjusted profit for owner_adjusted_profit goal type', () => {
    const b = makeCompletedBooking();
    // Owner-adj: 400 - (25+15+50+12+0+75) = 223
    expect(extractProfit(b, 'owner_adjusted_profit')).toBe(223);
  });

  it('returns revenue for revenue goal type', () => {
    const b = makeCompletedBooking();
    expect(extractProfit(b, 'revenue')).toBe(400);
  });

  it('returns null when actuals are missing', () => {
    const b = makeCompletedBooking({ actuals: null });
    expect(extractProfit(b, 'cash_profit')).toBeNull();
  });

  it('returns null when finalAmount is missing', () => {
    const b = makeCompletedBooking({ actuals: { finalAmount: null } });
    expect(extractProfit(b, 'cash_profit')).toBeNull();
  });

  it('returns null when finalAmount is empty string', () => {
    const b = makeCompletedBooking({ actuals: { finalAmount: '' } });
    expect(extractProfit(b, 'cash_profit')).toBeNull();
  });
});

// ── extractExpectedProfit ──

describe('extractExpectedProfit', () => {
  it('returns revenue for revenue goal type', () => {
    const b = makeScheduledBooking();
    expect(extractExpectedProfit(b, 'revenue')).toBe(350);
  });

  it('returns cash profit estimate', () => {
    const b = makeScheduledBooking();
    // 350 - (25+12+50) = 263
    expect(extractExpectedProfit(b, 'cash_profit')).toBe(263);
  });

  it('falls back to approved_quote when no estimate', () => {
    const b = makeScheduledBooking({ internal_estimate: null });
    expect(extractExpectedProfit(b, 'cash_profit')).toBe(350);
  });
});

// ── calculatePipelineProfit ──

describe('calculatePipelineProfit', () => {
  it('weights pending_review at 15%', () => {
    const bookings = [makePipelineBooking('pending_review')];
    const weights = { pending_review: 0.15, quote_sent: 0.50 };
    const result = calculatePipelineProfit(bookings, weights, 'cash_profit');
    // Expected: (300-25-10-40) * 0.15 = 225 * 0.15 = 33.75
    expect(result).toBeCloseTo(33.75, 2);
  });

  it('weights quote_sent at 50%', () => {
    const bookings = [makePipelineBooking('quote_sent', { approved_quote: 300 })];
    const weights = { pending_review: 0.15, quote_sent: 0.50 };
    const result = calculatePipelineProfit(bookings, weights, 'cash_profit');
    // Expected: (300-25-10-40) * 0.50 = 225 * 0.50 = 112.5
    expect(result).toBeCloseTo(112.5, 2);
  });

  it('returns 0 for empty array', () => {
    expect(calculatePipelineProfit([], {}, 'cash_profit')).toBe(0);
  });
});

// ── calculateCommittedProjection ──

describe('calculateCommittedProjection', () => {
  it('sums completed + scheduled at 100%', () => {
    const completed = [makeCompletedBooking()]; // 298 cash profit
    const scheduled = [makeScheduledBooking()]; // 263 expected cash profit
    const result = calculateCommittedProjection(completed, scheduled, 'cash_profit');
    expect(result).toBeCloseTo(298 + 263, 0);
  });

  it('excludes completed bookings with missing actuals', () => {
    const completed = [
      makeCompletedBooking(),
      makeCompletedBooking({ id: 'b-missing', actuals: null }),
    ];
    const result = calculateCommittedProjection(completed, [], 'cash_profit');
    expect(result).toBe(298);
  });
});

// ── determinePaceStatus ──

describe('determinePaceStatus', () => {
  it('returns achieved at 100%+', () => {
    expect(determinePaceStatus(100, 50)).toBe('achieved');
    expect(determinePaceStatus(120, 80)).toBe('achieved');
  });

  it('returns ahead when ratio >= 1.10', () => {
    expect(determinePaceStatus(55, 50)).toBe('ahead');
  });

  it('returns on_pace when ratio 0.90-1.10', () => {
    expect(determinePaceStatus(50, 50)).toBe('on_pace');
    expect(determinePaceStatus(46, 50)).toBe('on_pace');
  });

  it('returns at_risk when ratio 0.70-0.90', () => {
    expect(determinePaceStatus(40, 50)).toBe('at_risk');
  });

  it('returns behind when ratio < 0.70', () => {
    expect(determinePaceStatus(30, 50)).toBe('behind');
  });

  it('returns on_pace when no time elapsed', () => {
    expect(determinePaceStatus(0, 0)).toBe('on_pace');
  });
});

// ── calculateGoalProgress ──

describe('calculateGoalProgress', () => {
  it('calculates correct progress with mixed bookings', () => {
    const goal = makeGoal({ start_date: '2026-07-01', end_date: '2026-07-31' });
    const completed = [makeCompletedBooking()];
    const scheduled = [makeScheduledBooking()];
    const pipeline = [makePipelineBooking('pending_review')];

    const result = calculateGoalProgress(goal, completed, scheduled, pipeline);

    expect(result.completedProfit).toBe(298);
    expect(result.bookedProfit).toBeCloseTo(263, 0);
    expect(result.pipelineProfit).toBeGreaterThan(0);
    expect(result.committedProjection).toBeCloseTo(298 + 263, 0);
    expect(result.jobsCompleted).toBe(1);
    expect(result.jobsMissingActuals).toBe(0);
  });

  it('tracks missing actuals separately', () => {
    const goal = makeGoal();
    const completed = [
      makeCompletedBooking(),
      makeCompletedBooking({ id: 'b-missing', actuals: null }),
    ];

    const result = calculateGoalProgress(goal, completed, [], []);

    expect(result.jobsCompleted).toBe(1);
    expect(result.jobsMissingActuals).toBe(1);
    expect(result.completedProfit).toBe(298);
  });

  it('returns achieved when goal exceeded', () => {
    const goal = makeGoal({ target_amount: 200 });
    const completed = [makeCompletedBooking()]; // 298 profit

    const result = calculateGoalProgress(goal, completed, [], []);

    expect(result.paceStatus).toBe('achieved');
    expect(result.stretchAmount).toBeGreaterThan(0);
  });

  it('handles zero completed days', () => {
    // Set start_date to far future
    const goal = makeGoal({ start_date: '2030-07-01', end_date: '2030-07-31' });
    const result = calculateGoalProgress(goal, [], [], []);

    expect(result.workingDaysElapsed).toBe(0);
    expect(result.paceStatus).toBe('on_pace');
    expect(result.avgDailyProfit).toBe(0);
    expect(result.projectedEOP).toBe(0);
  });

  it('keeps completed, booked, and pipeline profit separate', () => {
    const goal = makeGoal();
    const completed = [makeCompletedBooking()];
    const scheduled = [makeScheduledBooking()];
    const pipeline = [makePipelineBooking('pending_review')];

    const result = calculateGoalProgress(goal, completed, scheduled, pipeline);

    // They should be independent values
    expect(result.completedProfit).toBe(298);
    expect(result.bookedProfit).toBeGreaterThan(0);
    expect(result.pipelineProfit).toBeGreaterThan(0);
    expect(result.committedProjection).toBe(result.completedProfit + result.bookedProfit);
    expect(result.weightedProjection).toBe(result.committedProjection + result.pipelineProfit);
  });
});

// ── generateAlerts ──

describe('generateAlerts', () => {
  it('generates behind_pace alert', () => {
    const progress = {
      paceStatus: 'behind',
      remaining: 5000,
      requiredDailyProfit: 500,
      workingDaysRemaining: 10,
      jobsMissingActuals: 0,
      jobsCompleted: 3,
      avgProfitPerJob: 200,
      committedProjection: 8000,
      stretchAmount: 0,
      projectedEOP: 10000,
      avgDailyProfit: 300,
    };
    const goal = makeGoal();
    const alerts = generateAlerts(progress, goal);
    expect(alerts.some(a => a.type === 'behind_pace')).toBe(true);
    expect(alerts.find(a => a.type === 'behind_pace').severity).toBe('warning');
  });

  it('generates goal_achieved alert', () => {
    const progress = {
      paceStatus: 'achieved',
      stretchAmount: 500,
      jobsMissingActuals: 0,
      jobsCompleted: 5,
      avgProfitPerJob: 300,
      committedProjection: 15500,
    };
    const goal = makeGoal();
    const alerts = generateAlerts(progress, goal);
    expect(alerts.some(a => a.type === 'goal_achieved')).toBe(true);
    expect(alerts.find(a => a.type === 'goal_achieved').severity).toBe('success');
  });

  it('generates missing_actuals alert', () => {
    const progress = {
      paceStatus: 'on_pace',
      jobsMissingActuals: 2,
      jobsCompleted: 5,
      avgProfitPerJob: 300,
      committedProjection: 10000,
      stretchAmount: 0,
    };
    const goal = makeGoal();
    const alerts = generateAlerts(progress, goal);
    expect(alerts.some(a => a.type === 'missing_actuals')).toBe(true);
  });

  it('generates low_avg_profit alert', () => {
    const progress = {
      paceStatus: 'on_pace',
      jobsMissingActuals: 0,
      jobsCompleted: 5,
      avgProfitPerJob: 50,
      committedProjection: 10000,
      stretchAmount: 0,
    };
    const goal = makeGoal({ minimum_job_profit: 75 });
    const alerts = generateAlerts(progress, goal);
    expect(alerts.some(a => a.type === 'low_avg_profit')).toBe(true);
  });

  it('generates committed_sufficient alert', () => {
    const progress = {
      paceStatus: 'ahead',
      jobsMissingActuals: 0,
      jobsCompleted: 10,
      avgProfitPerJob: 200,
      committedProjection: 16000,
      stretchAmount: 0,
      projectedEOP: 18000,
    };
    const goal = makeGoal({ target_amount: 15000 });
    const alerts = generateAlerts(progress, goal);
    expect(alerts.some(a => a.type === 'committed_sufficient')).toBe(true);
  });
});

// ── getTodayProgress ──

describe('getTodayProgress', () => {
  it('calculates today progress', () => {
    const goal = makeGoal();
    const progress = { requiredDailyProfit: 500 };
    const todayBookings = [
      makeCompletedBooking({ status: 'completed' }),
      makeScheduledBooking({ status: 'scheduled' }),
    ];

    const result = getTodayProgress(goal, todayBookings, progress);

    expect(result.profitNeededToday).toBe(500);
    expect(result.completedProfitToday).toBe(298);
    expect(result.bookedProfitToday).toBeGreaterThan(0);
    expect(result.capacityBooked).toBe(1);
  });
});

// ── getWeekProgress ──

describe('getWeekProgress', () => {
  it('calculates weekly progress', () => {
    const goal = makeGoal({ weekly_target: 3000 });
    const progress = { requiredDailyProfit: 500, workingDaysRemaining: 15 };
    const weekBookings = [makeCompletedBooking()];

    const result = getWeekProgress(goal, weekBookings, progress);

    expect(result.weeklyTarget).toBe(3000);
    expect(result.completedThisWeek).toBe(298);
    expect(result.remainingWeekly).toBeCloseTo(2702, 0);
  });
});

import { describe, it, expect } from 'vitest';
import { evaluateDecision } from '../decisionEngine';

function makeContext(overrides = {}) {
  return {
    estimate: {
      estimatedProfit: 250,
      estimatedMargin: 0.72,
      recommendedPrice: 400,
      estimatedTravelMinutes: 45,
      disposalAllowance: 25,
      estimatedFuelCost: 15,
      laborAllowance: 50,
    },
    confidence: { level: 'high', score: 85 },
    jobRating: { rating: 'good', score: 72, reasons: [] },
    riskFlags: [],
    blockerOverrides: {},
    goalProgress: {
      paceStatus: 'on_pace',
      pctAchieved: 50,
      requiredDailyProfit: 400,
      remaining: 2000,
      workingDaysRemaining: 5,
    },
    goal: {
      minimum_margin: 0.55,
      minimum_job_profit: 75,
      daily_capacity_limit: 4,
    },
    scheduleContext: {
      jobsToday: 1,
      capacityLimit: 4,
    },
    dynamicTargets: null,
    ...overrides,
  };
}

function makeDynamicTargets(overrides = {}) {
  return {
    remainingDailyProfit: 300,
    openSlots: 2,
    capacityLimit: 4,
    capacityBooked: 2,
    suggestedPerSlot: 150,
    urgency: 0.3,
    capacityScarcity: 0.5,
    todayCovered: false,
    paceStatus: 'on_pace',
    workingDaysRemaining: 5,
    periodRemaining: 2000,
    ...overrides,
  };
}

describe('evaluateDecision', () => {
  // ── Hard rules ──

  it('returns Pass for negative-profit job', () => {
    const ctx = makeContext({
      estimate: { ...makeContext().estimate, estimatedProfit: -50, estimatedMargin: -0.15 },
    });
    const d = evaluateDecision(ctx);
    expect(d.recommendation).toBe('pass');
    expect(d.blockers.length).toBeGreaterThan(0);
  });

  it('returns Pass for negative profit even when behind pace', () => {
    const ctx = makeContext({
      estimate: { ...makeContext().estimate, estimatedProfit: -20, estimatedMargin: -0.05 },
      goalProgress: { paceStatus: 'behind', pctAchieved: 20, requiredDailyProfit: 800, remaining: 5000, workingDaysRemaining: 6 },
    });
    const d = evaluateDecision(ctx);
    expect(d.recommendation).toBe('pass');
  });

  it('returns Pass for unresolved blocker', () => {
    const ctx = makeContext({
      riskFlags: [{ severity: 'blocker', type: 'hazmat', label: 'Hazardous material' }],
    });
    const d = evaluateDecision(ctx);
    expect(d.recommendation).toBe('pass');
    expect(d.headline).toContain('blocker');
  });

  it('does not Pass when blocker is overridden', () => {
    const ctx = makeContext({
      riskFlags: [{ severity: 'blocker', type: 'hazmat', label: 'Hazardous material' }],
      blockerOverrides: { hazmat: true },
    });
    const d = evaluateDecision(ctx);
    expect(d.recommendation).not.toBe('pass');
  });

  it('returns Pass when both profit and margin are below minimums (dual floor)', () => {
    const ctx = makeContext({
      estimate: { ...makeContext().estimate, estimatedProfit: 50, estimatedMargin: 0.40 },
    });
    const d = evaluateDecision(ctx);
    expect(d.recommendation).toBe('pass');
  });

  // ── Gate rules (force Review, not Pass) ──

  it('returns Review (not Pass) when only profit is below floor', () => {
    const ctx = makeContext({
      estimate: { ...makeContext().estimate, estimatedProfit: 50, estimatedMargin: 0.65 },
    });
    const d = evaluateDecision(ctx);
    expect(d.recommendation).toBe('review');
  });

  it('returns Review (not Pass) when only margin is below floor', () => {
    const ctx = makeContext({
      estimate: { ...makeContext().estimate, estimatedProfit: 500, estimatedMargin: 0.48 },
    });
    const d = evaluateDecision(ctx);
    expect(d.recommendation).toBe('review');
  });

  it('returns Review for low confidence', () => {
    const ctx = makeContext({
      confidence: { level: 'low', score: 35 },
    });
    const d = evaluateDecision(ctx);
    expect(d.recommendation).toBe('review');
  });

  it('returns Review for capacity conflict', () => {
    const ctx = makeContext({
      scheduleContext: { jobsToday: 4, capacityLimit: 4 },
    });
    const d = evaluateDecision(ctx);
    expect(d.recommendation).toBe('review');
  });

  // ── Soft rules / scoring ──

  it('returns Take for high-profit excellent-rated job', () => {
    const ctx = makeContext({
      estimate: { ...makeContext().estimate, estimatedProfit: 500, estimatedMargin: 0.80 },
      jobRating: { rating: 'excellent', score: 90 },
    });
    const d = evaluateDecision(ctx);
    expect(d.recommendation).toBe('take');
    expect(d.score).toBeGreaterThanOrEqual(65);
  });

  it('adjusts headline when behind pace and review', () => {
    const ctx = makeContext({
      goalProgress: { paceStatus: 'behind', pctAchieved: 25, requiredDailyProfit: 800, remaining: 5000, workingDaysRemaining: 6 },
      estimate: { ...makeContext().estimate, estimatedProfit: 150, estimatedMargin: 0.48 },
      jobRating: { rating: 'marginal', score: 55 },
      confidence: { level: 'medium', score: 60 },
    });
    const d = evaluateDecision(ctx);
    expect(d.recommendation).toBe('review');
    expect(d.headline).toContain('Behind pace');
  });

  it('works without active goal (soft rules skip gracefully)', () => {
    const ctx = makeContext({
      goalProgress: null,
      goal: null,
    });
    const d = evaluateDecision(ctx);
    expect(['take', 'review']).toContain(d.recommendation);
    expect(d.goalContext).toBeNull();
  });

  // ── Output structure ──

  it('populates all Decision fields', () => {
    const ctx = makeContext();
    const d = evaluateDecision(ctx);
    expect(d).toHaveProperty('recommendation');
    expect(d).toHaveProperty('score');
    expect(d).toHaveProperty('headline');
    expect(d).toHaveProperty('explanation');
    expect(d).toHaveProperty('reasons');
    expect(d).toHaveProperty('positiveFactors');
    expect(d).toHaveProperty('negativeFactors');
    expect(d).toHaveProperty('blockers');
    expect(d).toHaveProperty('goalContribution');
    expect(d).toHaveProperty('suggestedMinPrice');
    expect(d).toHaveProperty('priceForTargetMargin');
    expect(d).toHaveProperty('confidence');
    expect(d).toHaveProperty('ruleResults');
    expect(d).toHaveProperty('goalContext');
    expect(d).toHaveProperty('dynamicTargets');
    expect(d).toHaveProperty('scheduleContext');
    expect(d).toHaveProperty('evaluatedAt');
  });

  it('calculates suggestedMinPrice correctly', () => {
    const ctx = makeContext({
      goal: { minimum_margin: 0.55, minimum_job_profit: 75 },
      estimate: {
        ...makeContext().estimate,
        disposalAllowance: 25,
        estimatedFuelCost: 15,
        laborAllowance: 50,
      },
    });
    const d = evaluateDecision(ctx);
    expect(d.suggestedMinPrice).toBe(200);
    expect(d.priceForTargetMargin).toBe(200);
  });

  it('calculates goal contribution percentages', () => {
    const ctx = makeContext({
      goalProgress: { paceStatus: 'on_pace', pctAchieved: 50, requiredDailyProfit: 500, remaining: 2000, workingDaysRemaining: 5 },
      estimate: { ...makeContext().estimate, estimatedProfit: 250 },
    });
    const d = evaluateDecision(ctx);
    expect(d.goalContribution.dailyPct).toBe(50);
    expect(d.goalContribution.weeklyPct).toBe(10);
  });

  // ── Explanation ──

  it('generates a non-empty explanation', () => {
    const ctx = makeContext();
    const d = evaluateDecision(ctx);
    expect(d.explanation).toBeTruthy();
    expect(d.explanation.length).toBeGreaterThan(20);
  });

  it('explanation mentions safety floor when profit is below floor', () => {
    const ctx = makeContext({
      estimate: { ...makeContext().estimate, estimatedProfit: 50, estimatedMargin: 0.65 },
    });
    const d = evaluateDecision(ctx);
    expect(d.explanation).toContain('profit floor');
  });

  it('explanation mentions hard fail reason for negative profit', () => {
    const ctx = makeContext({
      estimate: { ...makeContext().estimate, estimatedProfit: -50, estimatedMargin: -0.15 },
    });
    const d = evaluateDecision(ctx);
    expect(d.explanation).toContain('loss');
  });

  // ── Dynamic targets ──

  it('slot_value rule boosts score when job meets per-slot target', () => {
    const dt = makeDynamicTargets({ suggestedPerSlot: 200, openSlots: 2 });
    const ctx = makeContext({
      dynamicTargets: dt,
      estimate: { ...makeContext().estimate, estimatedProfit: 250 },
    });
    const d = evaluateDecision(ctx);
    const slotRule = d.ruleResults.find(r => r.ruleId === 'slot_value');
    expect(slotRule).toBeTruthy();
    expect(slotRule.data?.bonus).toBeGreaterThan(0);
  });

  it('slot_value rule penalizes when job is well below per-slot target', () => {
    const dt = makeDynamicTargets({ suggestedPerSlot: 400, openSlots: 2 });
    const ctx = makeContext({
      dynamicTargets: dt,
      estimate: { ...makeContext().estimate, estimatedProfit: 100, estimatedMargin: 0.60 },
    });
    const d = evaluateDecision(ctx);
    const slotRule = d.ruleResults.find(r => r.ruleId === 'slot_value');
    expect(slotRule).toBeTruthy();
    expect(slotRule.data?.bonus).toBeLessThan(0);
  });

  it('capacity_scarcity penalizes weak job on last slot', () => {
    const dt = makeDynamicTargets({
      openSlots: 1,
      capacityBooked: 3,
      capacityScarcity: 0.75,
      suggestedPerSlot: 300,
      todayCovered: false,
    });
    const ctx = makeContext({
      dynamicTargets: dt,
      estimate: { ...makeContext().estimate, estimatedProfit: 100, estimatedMargin: 0.60 },
      scheduleContext: { jobsToday: 3, capacityLimit: 4 },
    });
    const d = evaluateDecision(ctx);
    const scarcityRule = d.ruleResults.find(r => r.ruleId === 'capacity_scarcity');
    expect(scarcityRule).toBeTruthy();
    expect(scarcityRule.data?.bonus).toBeLessThan(0);
  });

  it('capacity_scarcity rewards strong job on last slot', () => {
    const dt = makeDynamicTargets({
      openSlots: 1,
      capacityBooked: 3,
      capacityScarcity: 0.75,
      suggestedPerSlot: 200,
      todayCovered: false,
    });
    const ctx = makeContext({
      dynamicTargets: dt,
      estimate: { ...makeContext().estimate, estimatedProfit: 250, estimatedMargin: 0.70 },
      scheduleContext: { jobsToday: 3, capacityLimit: 4 },
    });
    const d = evaluateDecision(ctx);
    const scarcityRule = d.ruleResults.find(r => r.ruleId === 'capacity_scarcity');
    expect(scarcityRule).toBeTruthy();
    expect(scarcityRule.data?.bonus).toBeGreaterThan(0);
  });

  it('same job gets different scores depending on dynamic context', () => {
    const baseEstimate = { ...makeContext().estimate, estimatedProfit: 200, estimatedMargin: 0.65 };

    // Tuesday: behind pace, lots of capacity, needs money
    const tuesdayCtx = makeContext({
      estimate: baseEstimate,
      goalProgress: { paceStatus: 'behind', pctAchieved: 25, requiredDailyProfit: 600, remaining: 4000, workingDaysRemaining: 7 },
      scheduleContext: { jobsToday: 1, capacityLimit: 4 },
      dynamicTargets: makeDynamicTargets({
        remainingDailyProfit: 400,
        openSlots: 3,
        suggestedPerSlot: 133,
        urgency: 0.9,
        capacityScarcity: 0.25,
        todayCovered: false,
        paceStatus: 'behind',
      }),
    });
    const tuesdayDecision = evaluateDecision(tuesdayCtx);

    // Friday: goal met, last slot, ahead
    const fridayCtx = makeContext({
      estimate: baseEstimate,
      goalProgress: { paceStatus: 'ahead', pctAchieved: 95, requiredDailyProfit: 100, remaining: 200, workingDaysRemaining: 1 },
      scheduleContext: { jobsToday: 3, capacityLimit: 4 },
      dynamicTargets: makeDynamicTargets({
        remainingDailyProfit: 100,
        openSlots: 1,
        suggestedPerSlot: 100,
        urgency: 0.1,
        capacityScarcity: 0.75,
        todayCovered: false,
        paceStatus: 'ahead',
      }),
    });
    const fridayDecision = evaluateDecision(fridayCtx);

    // Tuesday score should be higher (behind pace, open capacity, job exceeds per-slot target)
    expect(tuesdayDecision.score).toBeGreaterThan(fridayDecision.score);
  });

  it('explanation includes dynamic target context when provided', () => {
    const dt = makeDynamicTargets({ openSlots: 2, suggestedPerSlot: 200 });
    const ctx = makeContext({ dynamicTargets: dt });
    const d = evaluateDecision(ctx);
    expect(d.explanation).toContain('remaining schedule');
    expect(d.explanation).toContain('$200');
  });

  it('explanation notes today is covered when todayCovered is true', () => {
    const dt = makeDynamicTargets({ todayCovered: true });
    const ctx = makeContext({ dynamicTargets: dt });
    const d = evaluateDecision(ctx);
    expect(d.explanation).toContain('already covered');
  });

  it('dynamicTargets are passed through to Decision output', () => {
    const dt = makeDynamicTargets();
    const ctx = makeContext({ dynamicTargets: dt });
    const d = evaluateDecision(ctx);
    expect(d.dynamicTargets).toEqual(dt);
  });
});

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
    },
    goal: {
      minimum_margin: 0.55,
      minimum_job_profit: 75,
    },
    scheduleContext: {
      jobsToday: 1,
      capacityLimit: 4,
    },
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
      goalProgress: { paceStatus: 'behind', pctAchieved: 20, requiredDailyProfit: 800 },
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

  it('returns Review (not Pass) when only profit is below minimum', () => {
    const ctx = makeContext({
      estimate: { ...makeContext().estimate, estimatedProfit: 50, estimatedMargin: 0.65 },
    });
    const d = evaluateDecision(ctx);
    expect(d.recommendation).toBe('review');
  });

  it('returns Review (not Pass) when only margin is below target', () => {
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
      goalProgress: { paceStatus: 'behind', pctAchieved: 25, requiredDailyProfit: 800 },
      estimate: { ...makeContext().estimate, estimatedProfit: 150, estimatedMargin: 0.48 },
      jobRating: { rating: 'marginal', score: 55 },
      confidence: { level: 'medium', score: 60 },
    });
    const d = evaluateDecision(ctx);
    // Gate: margin below target → review
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
    // directCosts = 90, priceForMargin = 90 / 0.45 = 200, minPrice = max(90+75, 200) = 200
    expect(d.suggestedMinPrice).toBe(200);
    expect(d.priceForTargetMargin).toBe(200);
  });

  it('calculates goal contribution percentages', () => {
    const ctx = makeContext({
      goalProgress: { paceStatus: 'on_pace', pctAchieved: 50, requiredDailyProfit: 500 },
      estimate: { ...makeContext().estimate, estimatedProfit: 250 },
    });
    const d = evaluateDecision(ctx);
    expect(d.goalContribution.dailyPct).toBe(50);
    expect(d.goalContribution.weeklyPct).toBe(10);
  });
});

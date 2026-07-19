import { describe, it, expect } from 'vitest';
import { calculateActuals, emptyActuals } from '../completion';

describe('calculateActuals', () => {
  const baseActuals = {
    finalAmount: 400,
    disposalCost: 25,
    fuelCost: 15,
    paidLabor: 50,
    ownerLabor: 75,
    paymentFees: 12,
    otherCosts: 0,
    actualTravelMinutes: 55,
    actualOnSiteMinutes: 90,
    actualTruckVolumePct: 60,
  };

  const baseEstimate = {
    estimatedProfit: 250,
    estimatedMargin: 0.75,
    recommendedPrice: 350,
    estimatedTravelMinutes: 60,
    estimatedOnSiteHours: 1,
    estimatedVolumePct: 50,
  };

  it('calculates cash profit excluding owner labor', () => {
    const result = calculateActuals(baseActuals, baseEstimate);
    // Cash costs: 25 + 15 + 50 + 12 + 0 = 102
    // Cash profit: 400 - 102 = 298
    expect(result.cashProfit).toBe(298);
    expect(result.costs.totalCash).toBe(102);
  });

  it('calculates owner-adjusted profit including owner labor', () => {
    const result = calculateActuals(baseActuals, baseEstimate);
    // Full costs: 102 + 75 = 177
    // Owner-adjusted profit: 400 - 177 = 223
    expect(result.ownerAdjustedProfit).toBe(223);
    expect(result.costs.totalFull).toBe(177);
  });

  it('calculates cash margin', () => {
    const result = calculateActuals(baseActuals, baseEstimate);
    expect(result.cashMargin).toBeCloseTo(298 / 400, 2);
  });

  it('calculates owner-adjusted margin', () => {
    const result = calculateActuals(baseActuals, baseEstimate);
    expect(result.ownerAdjustedMargin).toBeCloseTo(223 / 400, 2);
  });

  it('calculates profit delta vs estimate', () => {
    const result = calculateActuals(baseActuals, baseEstimate);
    expect(result.deltas.profitDelta).toBe(298 - 250);
  });

  it('calculates travel time delta', () => {
    const result = calculateActuals(baseActuals, baseEstimate);
    expect(result.deltas.travelDelta).toBe(55 - 60);
  });

  it('calculates on-site time delta in minutes', () => {
    const result = calculateActuals(baseActuals, baseEstimate);
    // estimated 1 hr = 60 min, actual 90 min
    expect(result.deltas.onSiteDelta).toBe(30);
  });

  it('calculates truck volume delta', () => {
    const result = calculateActuals(baseActuals, baseEstimate);
    expect(result.deltas.truckDelta).toBe(10);
  });

  it('calculates pricing accuracy', () => {
    const result = calculateActuals(baseActuals, baseEstimate);
    // |400 - 350| / 350 = 0.143, accuracy = 0.857
    expect(result.deltas.pricingAccuracy).toBeCloseTo(0.857, 2);
  });

  it('handles zero final amount', () => {
    const result = calculateActuals({ ...baseActuals, finalAmount: 0 }, baseEstimate);
    expect(result.cashMargin).toBe(0);
    expect(result.ownerAdjustedMargin).toBe(0);
  });

  it('handles missing optional fields gracefully', () => {
    const result = calculateActuals({
      finalAmount: 300,
      disposalCost: '',
      fuelCost: null,
      paidLabor: undefined,
    }, baseEstimate);
    expect(result.cashProfit).toBe(300);
    expect(result.costs.totalCash).toBe(0);
  });

  it('works without an estimate', () => {
    const result = calculateActuals(baseActuals, null);
    expect(result.cashProfit).toBe(298);
    expect(result.deltas).toEqual({});
  });
});

describe('emptyActuals', () => {
  it('returns an object with all required fields', () => {
    const a = emptyActuals();
    expect(a).toHaveProperty('finalAmount');
    expect(a).toHaveProperty('disposalCost');
    expect(a).toHaveProperty('fuelCost');
    expect(a).toHaveProperty('paidLabor');
    expect(a).toHaveProperty('ownerLabor');
    expect(a).toHaveProperty('paymentFees');
    expect(a).toHaveProperty('otherCosts');
    expect(a).toHaveProperty('actualTravelMinutes');
    expect(a).toHaveProperty('actualOnSiteMinutes');
    expect(a).toHaveProperty('actualTruckVolumePct');
  });
});

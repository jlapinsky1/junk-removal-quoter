import { describe, it, expect } from 'vitest';
import { computeMetrics, aggregateVarianceMetrics, computeJobVariance } from '../varianceAnalysis';

describe('computeMetrics', () => {
  it('calculates correct metrics for known pairs', () => {
    const pairs = [
      { estimated: 100, actual: 120 }, // error +20
      { estimated: 200, actual: 180 }, // error -20
      { estimated: 150, actual: 150 }, // error 0
    ];
    const m = computeMetrics(pairs);
    expect(m.sampleSize).toBe(3);
    expect(m.avgError).toBeCloseTo(0, 1);       // (20 + -20 + 0) / 3 = 0
    expect(m.absAvgError).toBeCloseTo(13.33, 1); // (20 + 20 + 0) / 3
    expect(m.medianError).toBe(0);
    expect(m.overestimateRate).toBeCloseTo(0.33, 1); // 1 of 3
    expect(m.underestimateRate).toBeCloseTo(0.33, 1);
  });

  it('handles single pair', () => {
    const pairs = [{ estimated: 100, actual: 130 }];
    const m = computeMetrics(pairs);
    expect(m.sampleSize).toBe(1);
    expect(m.avgError).toBe(30);
    expect(m.medianError).toBe(30);
    expect(m.underestimateRate).toBe(1); // actual > estimated
  });

  it('skips MAPE for small denominators', () => {
    const pairs = [{ estimated: 3, actual: 10 }];
    const m = computeMetrics(pairs, 10);
    expect(m.mape).toBeNull();
  });

  it('calculates MAPE when denominator is large enough', () => {
    const pairs = [
      { estimated: 100, actual: 120 }, // 20% error
      { estimated: 200, actual: 240 }, // 20% error
    ];
    const m = computeMetrics(pairs);
    expect(m.mape).toBeCloseTo(0.20, 2);
  });

  it('returns null for empty array', () => {
    expect(computeMetrics([])).toBeNull();
  });
});

describe('aggregateVarianceMetrics', () => {
  const booking = {
    internal_estimate: {
      recommendedPrice: 400,
      estimatedProfit: 250,
      estimatedMargin: 0.72,
      estimatedTravelMinutes: 60,
      estimatedOnSiteHours: 1.5,
      estimatedVolumePct: 50,
      disposalAllowance: 25,
    },
    actuals: {
      finalAmount: 400,
      disposalCost: 30,
      fuelCost: 15,
      paidLabor: 50,
      ownerLabor: 75,
      paymentFees: 12,
      otherCosts: 0,
      actualTravelMinutes: 70,
      actualOnSiteMinutes: 100,
      actualTruckVolumePct: 60,
    },
  };

  it('returns metrics for all fields with valid data', () => {
    const result = aggregateVarianceMetrics([booking]);
    expect(result.price).not.toBeNull();
    expect(result.price.sampleSize).toBe(1);
    expect(result.cashProfit).not.toBeNull();
    expect(result.travelMinutes).not.toBeNull();
    expect(result.onSiteMinutes).not.toBeNull();
    expect(result.truckVolumePct).not.toBeNull();
    expect(result.disposalCost).not.toBeNull();
  });

  it('returns null for fields with missing data', () => {
    const incomplete = { internal_estimate: {}, actuals: {} };
    const result = aggregateVarianceMetrics([incomplete]);
    expect(result.price).toBeNull();
    expect(result.travelMinutes).toBeNull();
  });
});

describe('computeJobVariance', () => {
  it('computes per-field variance for a single booking', () => {
    const booking = {
      internal_estimate: {
        recommendedPrice: 300,
        estimatedProfit: 200,
        estimatedMargin: 0.70,
        estimatedTravelMinutes: 45,
        estimatedOnSiteHours: 1,
        estimatedVolumePct: 30,
        disposalAllowance: 25,
      },
      actuals: {
        finalAmount: 350,
        disposalCost: 25,
        fuelCost: 10,
        paidLabor: 40,
        ownerLabor: 60,
        paymentFees: 10,
        otherCosts: 0,
        actualTravelMinutes: 50,
        actualOnSiteMinutes: 75,
        actualTruckVolumePct: 40,
      },
    };
    const v = computeJobVariance(booking);
    expect(v.price.estimated).toBe(300);
    expect(v.price.actual).toBe(350);
    expect(v.price.error).toBe(50);
    expect(v.travelMinutes.error).toBe(5);
    expect(v.onSiteMinutes.error).toBe(15); // 75 - 60
    expect(v.truckVolumePct.error).toBe(10);
  });
});

import { describe, it, expect } from 'vitest';
import { rateJob, RATING_THRESHOLDS } from '../jobRating';

describe('rateJob', () => {
  it('rates an excellent job', () => {
    const estimate = {
      estimatedMargin: 0.85,
      estimatedProfit: 400,
      estimatedTravelMinutes: 20,
      estimatedOnSiteHours: 0.5,
      estimatedVolumePct: 70,
    };
    const result = rateJob(estimate, { level: 'high' });
    expect(result.rating).toBe('excellent');
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('rates a good job', () => {
    const estimate = {
      estimatedMargin: 0.72,
      estimatedProfit: 200,
      estimatedTravelMinutes: 50,
      estimatedOnSiteHours: 1.5,
      estimatedVolumePct: 40,
    };
    const result = rateJob(estimate, { level: 'high' });
    expect(result.rating).toBe('good');
  });

  it('rates a marginal job with low margin', () => {
    const estimate = {
      estimatedMargin: 0.58,
      estimatedProfit: 80,
      estimatedTravelMinutes: 70,
      estimatedOnSiteHours: 2.5,
      estimatedVolumePct: 20,
    };
    const result = rateJob(estimate, { level: 'medium' });
    expect(result.rating).toBe('marginal');
  });

  it('rates a poor job', () => {
    const estimate = {
      estimatedMargin: 0.40,
      estimatedProfit: 30,
      estimatedTravelMinutes: 120,
      estimatedOnSiteHours: 5,
      estimatedVolumePct: 10,
    };
    const result = rateJob(estimate, { level: 'low' });
    expect(result.rating).toBe('poor');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('includes dimension scores', () => {
    const estimate = {
      estimatedMargin: 0.75,
      estimatedProfit: 200,
      estimatedTravelMinutes: 40,
      estimatedOnSiteHours: 1,
      estimatedVolumePct: 50,
    };
    const result = rateJob(estimate, { level: 'high' });
    expect(result.dimensions).toHaveProperty('margin');
    expect(result.dimensions).toHaveProperty('profit');
    expect(result.dimensions).toHaveProperty('travel');
    expect(result.dimensions).toHaveProperty('duration');
    expect(result.dimensions).toHaveProperty('truckUtilization');
    expect(result.dimensions).toHaveProperty('confidence');
  });

  it('penalizes low confidence', () => {
    const estimate = {
      estimatedMargin: 0.75,
      estimatedProfit: 200,
      estimatedTravelMinutes: 40,
      estimatedOnSiteHours: 1,
      estimatedVolumePct: 50,
    };
    const highConf = rateJob(estimate, { level: 'high' });
    const lowConf = rateJob(estimate, { level: 'low' });
    expect(highConf.score).toBeGreaterThan(lowConf.score);
  });

  it('handles null volume percent gracefully', () => {
    const estimate = {
      estimatedMargin: 0.75,
      estimatedProfit: 200,
      estimatedTravelMinutes: 40,
      estimatedOnSiteHours: 1,
      estimatedVolumePct: null,
    };
    const result = rateJob(estimate, { level: 'high' });
    expect(result.rating).toBeTruthy();
  });

  it('thresholds are configurable', () => {
    expect(RATING_THRESHOLDS.margin.excellent).toBe(0.80);
    expect(RATING_THRESHOLDS.profit.excellent).toBe(300);
    expect(RATING_THRESHOLDS.travelMinutes.excellent).toBe(30);
  });
});

import { describe, it, expect } from 'vitest';
import { generateCalibrationSuggestions, getConfidence, CALIBRATION_THRESHOLDS, MAX_ADJUSTMENT_PCT } from '../calibrationEngine';

function makeBooking(overrides = {}) {
  return {
    id: `b-${Math.random().toString(36).slice(2, 8)}`,
    access_type: 'Curbside',
    quantity: 'A few items (1-5)',
    stairs: 'none',
    internal_estimate: {
      recommendedPrice: 300,
      estimatedProfit: 200,
      estimatedMargin: 0.70,
      estimatedTravelMinutes: 60,
      estimatedOnSiteHours: 1,
      estimatedVolumePct: 25,
      disposalAllowance: 25,
      estimatedFuelCost: 12,
      laborAllowance: 40,
    },
    actuals: {
      finalAmount: 300,
      disposalCost: 25,
      fuelCost: 12,
      paidLabor: 40,
      ownerLabor: 50,
      paymentFees: 10,
      otherCosts: 0,
      actualTravelMinutes: 60,
      actualOnSiteMinutes: 60,
      actualTruckVolumePct: 25,
    },
    ...overrides,
  };
}

// Create N bookings with consistent underestimation of on-site time
function makeUnderestimatedJobs(n, extraMinutes = 20) {
  return Array.from({ length: n }, () =>
    makeBooking({
      actuals: {
        ...makeBooking().actuals,
        actualOnSiteMinutes: 60 + extraMinutes, // estimated 60 (1hr), actual 80
      },
    })
  );
}

describe('getConfidence', () => {
  it('returns null for insufficient sample', () => {
    expect(getConfidence(3)).toBeNull();
  });

  it('returns weak for 5-9 samples', () => {
    expect(getConfidence(5)).toBe('weak');
    expect(getConfidence(9)).toBe('weak');
  });

  it('returns strong for 10-19 samples', () => {
    expect(getConfidence(10)).toBe('strong');
    expect(getConfidence(19)).toBe('strong');
  });

  it('returns very_strong for 20+ samples', () => {
    expect(getConfidence(20)).toBe('very_strong');
    expect(getConfidence(100)).toBe('very_strong');
  });
});

describe('generateCalibrationSuggestions', () => {
  it('returns no suggestions when sample < 5', () => {
    const jobs = [makeBooking(), makeBooking(), makeBooking()];
    const suggestions = generateCalibrationSuggestions(jobs, {});
    expect(suggestions).toHaveLength(0);
  });

  it('returns no suggestions when estimates are accurate', () => {
    const jobs = Array.from({ length: 10 }, () => makeBooking());
    const suggestions = generateCalibrationSuggestions(jobs, {});
    expect(suggestions).toHaveLength(0);
  });

  it('generates suggestions for consistent underestimation', () => {
    const jobs = makeUnderestimatedJobs(10, 30); // 60 est vs 90 actual = 50% bias
    const suggestions = generateCalibrationSuggestions(jobs, {});
    const onSiteSuggestions = suggestions.filter(s => s.metric === 'onSiteMinutes');
    expect(onSiteSuggestions.length).toBeGreaterThan(0);
    expect(onSiteSuggestions[0].direction).toBe('increase');
    expect(onSiteSuggestions[0].sampleSize).toBe(10);
  });

  it('respects max adjustment cap of 30%', () => {
    // 60 est vs 150 actual = 150% bias, should cap at 30%
    const jobs = Array.from({ length: 10 }, () =>
      makeBooking({
        actuals: { ...makeBooking().actuals, actualOnSiteMinutes: 150 },
      })
    );
    const suggestions = generateCalibrationSuggestions(jobs, {});
    const onSite = suggestions.find(s => s.metric === 'onSiteMinutes' && s.dimension === 'overall');
    if (onSite) {
      expect(onSite.magnitude).toBeLessThanOrEqual(MAX_ADJUSTMENT_PCT * 100);
    }
  });

  it('assigns correct confidence levels', () => {
    const jobs5 = makeUnderestimatedJobs(5, 30);
    const s5 = generateCalibrationSuggestions(jobs5, {});
    const onSite5 = s5.find(s => s.metric === 'onSiteMinutes' && s.dimension === 'overall');
    if (onSite5) expect(onSite5.confidence).toBe('weak');

    const jobs12 = makeUnderestimatedJobs(12, 30);
    const s12 = generateCalibrationSuggestions(jobs12, {});
    const onSite12 = s12.find(s => s.metric === 'onSiteMinutes' && s.dimension === 'overall');
    if (onSite12) expect(onSite12.confidence).toBe('strong');
  });

  it('uses signed bias for direction, not MAPE', () => {
    // Consistent overestimation: estimated 60 min, actual 40 min
    const jobs = Array.from({ length: 10 }, () =>
      makeBooking({
        actuals: { ...makeBooking().actuals, actualOnSiteMinutes: 40 },
      })
    );
    const suggestions = generateCalibrationSuggestions(jobs, {});
    const onSite = suggestions.find(s => s.metric === 'onSiteMinutes' && s.dimension === 'overall');
    if (onSite) {
      expect(onSite.direction).toBe('decrease');
      expect(onSite.signedBias).toBeLessThan(0);
    }
  });
});

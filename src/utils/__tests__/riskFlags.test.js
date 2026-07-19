import { describe, it, expect } from 'vitest';
import { detectRiskFlags, checkPriceFlags, checkAcceptanceBlockers, calculateConfidence, hasBlockers } from '../riskFlags';

const baseBooking = {
  quantity: 'A few items (1-5)',
  accessType: 'curbside',
  stairs: 'none',
  elevator: 'no',
  detectedItems: [],
  description: '',
  photoCount: 5,
};

const baseEstimate = {
  estimatedTravelMinutes: 60,
  estimatedDirectCost: 100,
  recommendedPrice: 250,
  missingInputs: [],
  weightRisk: false,
};

describe('detectRiskFlags', () => {
  it('returns info for minimal photos', () => {
    const flags = detectRiskFlags({ ...baseBooking, photoCount: 3 }, baseEstimate);
    const f = flags.find(f => f.flag === 'minimal_photos');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('info');
  });

  it('returns warning for insufficient photos', () => {
    const flags = detectRiskFlags({ ...baseBooking, photoCount: 2 }, baseEstimate);
    const f = flags.find(f => f.flag === 'low_photos');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('warning');
  });

  it('returns blocker for hazardous materials', () => {
    const flags = detectRiskFlags({
      ...baseBooking,
      description: 'old paint cans and some chemicals',
    }, baseEstimate);
    const f = flags.find(f => f.flag === 'hazmat_possible');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('blocker');
  });

  it('returns warning for heavy items', () => {
    const flags = detectRiskFlags({
      ...baseBooking,
      detectedItems: [{ item: 'refrigerator', quantity: 1 }],
    }, baseEstimate);
    const f = flags.find(f => f.flag === 'heavy_items');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('warning');
  });

  it('returns warning for difficult items', () => {
    const flags = detectRiskFlags({
      ...baseBooking,
      detectedItems: [{ item: 'piano', quantity: 1 }],
    }, baseEstimate);
    const f = flags.find(f => f.flag === 'difficult_items');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('warning');
  });

  it('returns info for one flight of stairs', () => {
    const flags = detectRiskFlags({ ...baseBooking, stairs: 'one_flight' }, baseEstimate);
    const f = flags.find(f => f.flag === 'stairs');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('info');
  });

  it('returns warning for multiple flights', () => {
    const flags = detectRiskFlags({ ...baseBooking, stairs: 'multiple' }, baseEstimate);
    const f = flags.find(f => f.flag === 'stairs_multiple');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('warning');
  });

  it('returns warning for no elevator on upper floor', () => {
    const flags = detectRiskFlags({
      ...baseBooking,
      accessType: 'upstairs',
      elevator: 'no',
    }, baseEstimate);
    const f = flags.find(f => f.flag === 'no_elevator');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('warning');
  });

  it('returns warning for hidden items in description', () => {
    const flags = detectRiskFlags({
      ...baseBooking,
      description: 'couch and some more stuff not pictured',
    }, baseEstimate);
    const f = flags.find(f => f.flag === 'hidden_items');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('warning');
  });

  it('returns blocker for critical missing pricing inputs', () => {
    const estimate = {
      ...baseEstimate,
      missingInputs: [
        { field: 'a', financial: true },
        { field: 'b', financial: true },
        { field: 'c', financial: true },
      ],
    };
    const flags = detectRiskFlags(baseBooking, estimate);
    const f = flags.find(f => f.flag === 'critical_missing_inputs');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('blocker');
  });

  it('returns warning for weight risk', () => {
    const estimate = { ...baseEstimate, weightRisk: true, weightRiskReason: 'heavy items' };
    const flags = detectRiskFlags(baseBooking, estimate);
    const f = flags.find(f => f.flag === 'weight_risk');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('warning');
  });

  it('returns construction debris warning', () => {
    const flags = detectRiskFlags({
      ...baseBooking,
      description: 'old drywall and concrete from demolition',
    }, baseEstimate);
    const f = flags.find(f => f.flag === 'construction_debris');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('warning');
  });
});

describe('checkPriceFlags', () => {
  it('returns blocker for no price', () => {
    const flags = checkPriceFlags('', baseEstimate, { minimumPrice: 150 });
    expect(hasBlockers(flags)).toBe(true);
  });

  it('returns blocker for price below minimum', () => {
    const flags = checkPriceFlags(100, baseEstimate, { minimumPrice: 150 });
    const f = flags.find(f => f.flag === 'below_minimum');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('blocker');
  });

  it('returns blocker for very low margin (<50%)', () => {
    const estimate = { ...baseEstimate, estimatedDirectCost: 200, recommendedPrice: 250 };
    const flags = checkPriceFlags(220, estimate, { minimumPrice: 150 });
    const f = flags.find(f => f.flag === 'very_low_margin');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('blocker');
  });

  it('returns warning for price below recommended', () => {
    const flags = checkPriceFlags(200, baseEstimate, { minimumPrice: 150 });
    const f = flags.find(f => f.flag === 'below_recommended');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('warning');
  });

  it('returns no flags for a good price', () => {
    const flags = checkPriceFlags(300, baseEstimate, { minimumPrice: 150 });
    const blockers = flags.filter(f => f.severity === 'blocker');
    expect(blockers).toHaveLength(0);
  });
});

describe('checkAcceptanceBlockers', () => {
  it('blocks expired quotes', () => {
    const booking = { quoteExpiresAt: '2020-01-01T00:00:00Z', availableSlots: ['Slot A'] };
    const flags = checkAcceptanceBlockers(booking, 'Slot A', []);
    expect(hasBlockers(flags)).toBe(true);
    expect(flags.find(f => f.flag === 'quote_expired')).toBeTruthy();
  });

  it('blocks unavailable slots', () => {
    const booking = { quoteExpiresAt: '2099-01-01T00:00:00Z', availableSlots: ['Slot A'] };
    const flags = checkAcceptanceBlockers(booking, 'Slot A', ['Slot A']);
    expect(hasBlockers(flags)).toBe(true);
    expect(flags.find(f => f.flag === 'slot_unavailable')).toBeTruthy();
  });

  it('blocks when no slot selected but slots available', () => {
    const booking = { quoteExpiresAt: '2099-01-01T00:00:00Z', availableSlots: ['A', 'B'] };
    const flags = checkAcceptanceBlockers(booking, '', []);
    expect(hasBlockers(flags)).toBe(true);
  });

  it('passes for valid selection', () => {
    const booking = { quoteExpiresAt: '2099-01-01T00:00:00Z', availableSlots: ['A'] };
    const flags = checkAcceptanceBlockers(booking, 'A', []);
    expect(hasBlockers(flags)).toBe(false);
  });
});

describe('calculateConfidence', () => {
  it('returns high for clean booking with no flags', () => {
    const conf = calculateConfidence({ ...baseBooking, photoCount: 8, detectedItems: [{ item: 'x' }], description: 'lots of detail here about items' }, []);
    expect(conf.level).toBe('high');
    expect(conf.score).toBeGreaterThanOrEqual(75);
  });

  it('returns low when many blockers present', () => {
    const flags = [
      { severity: 'blocker', message: 'a' },
      { severity: 'blocker', message: 'b' },
      { severity: 'blocker', message: 'c' },
    ];
    const conf = calculateConfidence(baseBooking, flags);
    expect(conf.level).toBe('low');
  });

  it('returns medium for moderate warnings', () => {
    const flags = [
      { severity: 'warning', message: 'a' },
      { severity: 'warning', message: 'b' },
      { severity: 'warning', message: 'c' },
    ];
    const conf = calculateConfidence(baseBooking, flags);
    expect(conf.level).toBe('medium');
  });
});

describe('hasBlockers', () => {
  it('returns false for no flags', () => {
    expect(hasBlockers([])).toBe(false);
  });

  it('returns false for only info/warning', () => {
    expect(hasBlockers([
      { severity: 'info' },
      { severity: 'warning' },
    ])).toBe(false);
  });

  it('returns true when a blocker exists', () => {
    expect(hasBlockers([
      { severity: 'warning' },
      { severity: 'blocker' },
    ])).toBe(true);
  });
});

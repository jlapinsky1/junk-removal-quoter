import { describe, it, expect } from 'vitest';
import { buildEstimate } from '../estimateBuilder';
import { DEFAULT_SETTINGS } from '../storage';

const baseBooking = {
  quantity: 'A few items (1-5)',
  accessType: 'curbside',
  stairs: 'none',
  elevator: 'no',
  detectedItems: [],
  description: '',
  photoCount: 5,
};

describe('buildEstimate', () => {
  it('maps quantity to correct load size', () => {
    const est = buildEstimate({ ...baseBooking, quantity: 'A few items (1-5)' }, DEFAULT_SETTINGS);
    expect(est.loadSize).toBe('Normal small job');

    const est2 = buildEstimate({ ...baseBooking, quantity: 'Whole house / cleanout' }, DEFAULT_SETTINGS);
    expect(est2.loadSize).toBe('Full truck/trailer');
  });

  it('maps access type to pricing access type', () => {
    const est = buildEstimate({ ...baseBooking, accessType: 'basement' }, DEFAULT_SETTINGS);
    expect(est.accessType).toBe('Upstairs / basement');
  });

  it('flags missing quantity as a financial missing input', () => {
    const est = buildEstimate({ ...baseBooking, quantity: '' }, DEFAULT_SETTINGS);
    const quantityMissing = est.missingInputs.find(m => m.field === 'quantity');
    expect(quantityMissing).toBeTruthy();
    expect(quantityMissing.financial).toBe(true);
  });

  it('always flags missing distance data', () => {
    const est = buildEstimate(baseBooking, DEFAULT_SETTINGS);
    const distMissing = est.missingInputs.find(m => m.field === 'distance');
    expect(distMissing).toBeTruthy();
    expect(distMissing.financial).toBe(true);
  });

  it('does not silently zero disposal when dumpFee is missing', () => {
    const settingsNoDump = { ...DEFAULT_SETTINGS, dumpFee: undefined };
    const est = buildEstimate(baseBooking, settingsNoDump);
    const missing = est.missingInputs.find(m => m.field === 'dumpFee');
    expect(missing).toBeTruthy();
    expect(missing.financial).toBe(true);
  });

  it('detects heavy items from detected items list', () => {
    const booking = {
      ...baseBooking,
      detectedItems: [{ item: 'Refrigerator', quantity: 1 }],
    };
    const est = buildEstimate(booking, DEFAULT_SETTINGS);
    expect(est.hasHeavyItems).toBe(true);
    expect(est.hasAppliances).toBe(true);
    expect(est.addOns).toContain('Heavy item');
    expect(est.addOns).toContain('Appliance');
  });

  it('detects difficult items', () => {
    const booking = {
      ...baseBooking,
      detectedItems: [{ item: 'Grand Piano', quantity: 1 }],
    };
    const est = buildEstimate(booking, DEFAULT_SETTINGS);
    expect(est.hasDifficultItems).toBe(true);
  });

  it('flags weight risk for heavy material items', () => {
    const booking = {
      ...baseBooking,
      detectedItems: [{ item: 'concrete blocks', quantity: 20 }],
    };
    const est = buildEstimate(booking, DEFAULT_SETTINGS);
    expect(est.weightRisk).toBe(true);
    expect(est.weightRiskReason).toBeTruthy();
  });

  it('flags weight risk for full truck loads', () => {
    const booking = {
      ...baseBooking,
      quantity: 'Whole house / cleanout',
    };
    const est = buildEstimate(booking, DEFAULT_SETTINGS);
    expect(est.weightRisk).toBe(true);
  });

  it('adds stairs and long carry add-ons for indoor with stairs', () => {
    const booking = {
      ...baseBooking,
      accessType: 'upstairs',
      stairs: 'multiple',
    };
    const est = buildEstimate(booking, DEFAULT_SETTINGS);
    expect(est.addOns).toContain('Stairs');
    expect(est.addOns).toContain('Long carry');
  });

  it('increases on-site time for stairs and difficult access', () => {
    const simple = buildEstimate(baseBooking, DEFAULT_SETTINGS);
    const complex = buildEstimate({
      ...baseBooking,
      accessType: 'basement',
      stairs: 'multiple',
    }, DEFAULT_SETTINGS);
    expect(complex.estimatedOnSiteHours).toBeGreaterThan(simple.estimatedOnSiteHours);
  });

  it('applies target margin floor', () => {
    const est = buildEstimate(baseBooking, DEFAULT_SETTINGS);
    expect(est.estimatedMargin).toBeGreaterThanOrEqual(0);
    expect(est.recommendedPrice).toBeGreaterThan(0);
  });

  it('returns a valid breakdown array', () => {
    const est = buildEstimate(baseBooking, DEFAULT_SETTINGS);
    expect(Array.isArray(est.breakdown)).toBe(true);
    expect(est.breakdown.length).toBeGreaterThan(0);
    for (const item of est.breakdown) {
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('type');
    }
  });

  it('returns estimated volume percent', () => {
    const est = buildEstimate({ ...baseBooking, quantity: 'Multiple rooms' }, DEFAULT_SETTINGS);
    expect(est.estimatedVolumePct).toBe(75);
  });

  it('returns null volume percent for unknown quantity', () => {
    const est = buildEstimate({ ...baseBooking, quantity: 'something weird' }, DEFAULT_SETTINGS);
    expect(est.estimatedVolumePct).toBeNull();
  });
});

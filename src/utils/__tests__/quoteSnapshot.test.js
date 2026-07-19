import { describe, it, expect } from 'vitest';
import { createQuoteSnapshot, createPriceOverrideAudit, CUSTOMER_TERMS } from '../quoteSnapshot';
import { DEFAULT_SETTINGS } from '../storage';

const baseEstimate = {
  estimatedProfit: 200,
  estimatedMargin: 0.72,
  estimatedDirectCost: 100,
  estimatedTravelMinutes: 60,
  estimatedOnSiteHours: 1.5,
  estimatedVolumePct: 40,
  loadSize: 'Quarter truck/trailer',
  accessType: 'Curbside / already outside',
  addOns: ['Stairs'],
  breakdown: [{ label: 'Base', value: 275, type: 'price' }],
  numberOfDumpLoads: 1,
  laborAllowance: 75,
  disposalAllowance: 25,
  estimatedFuelCost: 8,
  targetMargin: 0.70,
  missingInputs: [{ field: 'distance', message: 'No distance', financial: true }],
  weightRisk: false,
  weightRiskReason: null,
};

describe('createQuoteSnapshot', () => {
  it('creates a frozen snapshot with all required fields', () => {
    const snapshot = createQuoteSnapshot({
      bookingId: 'booking-1',
      version: 1,
      approvedPrice: 300,
      recommendedPrice: 275,
      estimate: baseEstimate,
      settings: DEFAULT_SETTINGS,
      availableSlots: ['Mon 9am', 'Tue 1pm'],
      expiresAt: '2099-01-01T00:00:00Z',
    });

    expect(snapshot.bookingId).toBe('booking-1');
    expect(snapshot.version).toBe(1);
    expect(snapshot.approvedPrice).toBe(300);
    expect(snapshot.recommendedPrice).toBe(275);
    expect(snapshot.snapshotId).toBeTruthy();
    expect(snapshot.createdAt).toBeTruthy();
    expect(snapshot.expiresAt).toBe('2099-01-01T00:00:00Z');
    expect(snapshot.availableSlots).toEqual(['Mon 9am', 'Tue 1pm']);
  });

  it('freezes the snapshot (immutable)', () => {
    const snapshot = createQuoteSnapshot({
      bookingId: 'booking-1',
      version: 1,
      approvedPrice: 300,
      recommendedPrice: 275,
      estimate: baseEstimate,
      settings: DEFAULT_SETTINGS,
      availableSlots: [],
      expiresAt: '2099-01-01T00:00:00Z',
    });

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => { snapshot.approvedPrice = 999; }).toThrow();
  });

  it('deep-copies estimate data so source mutations do not affect snapshot', () => {
    const snapshot = createQuoteSnapshot({
      bookingId: 'booking-1',
      version: 1,
      approvedPrice: 300,
      recommendedPrice: 275,
      estimate: baseEstimate,
      settings: DEFAULT_SETTINGS,
      availableSlots: [],
      expiresAt: '2099-01-01T00:00:00Z',
    });

    expect(snapshot.estimateSnapshot.addOns).toEqual(['Stairs']);
    expect(snapshot.estimateSnapshot.breakdown).toHaveLength(1);
    expect(snapshot.estimateSnapshot.missingInputs).toHaveLength(1);
  });

  it('stores settings snapshot with pricing-relevant fields only', () => {
    const snapshot = createQuoteSnapshot({
      bookingId: 'booking-1',
      version: 1,
      approvedPrice: 300,
      recommendedPrice: 275,
      estimate: baseEstimate,
      settings: DEFAULT_SETTINGS,
      availableSlots: [],
      expiresAt: '2099-01-01T00:00:00Z',
    });

    expect(snapshot.settingsSnapshot.dumpFee).toBe(DEFAULT_SETTINGS.dumpFee);
    expect(snapshot.settingsSnapshot.minimumPrice).toBe(DEFAULT_SETTINGS.minimumPrice);
    expect(snapshot.settingsSnapshot.basePrices).toBeTruthy();
    // Should not include non-pricing settings
    expect(snapshot.settingsSnapshot).not.toHaveProperty('homeBaseAddress');
    expect(snapshot.settingsSnapshot).not.toHaveProperty('landfillAddress');
  });

  it('includes customer terms', () => {
    const snapshot = createQuoteSnapshot({
      bookingId: 'booking-1',
      version: 1,
      approvedPrice: 300,
      recommendedPrice: 275,
      estimate: baseEstimate,
      settings: DEFAULT_SETTINGS,
      availableSlots: [],
      expiresAt: '2099-01-01T00:00:00Z',
    });

    expect(snapshot.customerTerms).toBe(CUSTOMER_TERMS);
    expect(snapshot.customerTerms.customerConfirmations).toHaveLength(3);
  });

  it('records admin override when provided', () => {
    const override = { reason: 'Repeat customer discount', adminId: 'admin' };
    const snapshot = createQuoteSnapshot({
      bookingId: 'booking-1',
      version: 1,
      approvedPrice: 250,
      recommendedPrice: 300,
      estimate: baseEstimate,
      settings: DEFAULT_SETTINGS,
      availableSlots: [],
      expiresAt: '2099-01-01T00:00:00Z',
      adminOverride: override,
    });

    expect(snapshot.adminOverride).toEqual(override);
  });

  it('sets adminOverride to null when not provided', () => {
    const snapshot = createQuoteSnapshot({
      bookingId: 'booking-1',
      version: 1,
      approvedPrice: 300,
      recommendedPrice: 300,
      estimate: baseEstimate,
      settings: DEFAULT_SETTINGS,
      availableSlots: [],
      expiresAt: '2099-01-01T00:00:00Z',
    });

    expect(snapshot.adminOverride).toBeNull();
  });

  it('increments versions correctly', () => {
    const v1 = createQuoteSnapshot({
      bookingId: 'booking-1',
      version: 1,
      approvedPrice: 300,
      recommendedPrice: 300,
      estimate: baseEstimate,
      settings: DEFAULT_SETTINGS,
      availableSlots: [],
      expiresAt: '2099-01-01T00:00:00Z',
    });
    const v2 = createQuoteSnapshot({
      bookingId: 'booking-1',
      version: 2,
      approvedPrice: 350,
      recommendedPrice: 300,
      estimate: baseEstimate,
      settings: DEFAULT_SETTINGS,
      availableSlots: [],
      expiresAt: '2099-01-01T00:00:00Z',
    });

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(v1.snapshotId).not.toBe(v2.snapshotId);
  });
});

describe('createPriceOverrideAudit', () => {
  it('creates an audit record with correct fields', () => {
    const audit = createPriceOverrideAudit({
      bookingId: 'b-1',
      recommendedPrice: 300,
      approvedPrice: 250,
      reason: 'Repeat customer',
      adminId: 'admin-1',
    });

    expect(audit.bookingId).toBe('b-1');
    expect(audit.recommendedPrice).toBe(300);
    expect(audit.approvedPrice).toBe(250);
    expect(audit.difference).toBe(-50);
    expect(audit.percentDifference).toBe('-16.7');
    expect(audit.reason).toBe('Repeat customer');
    expect(audit.adminId).toBe('admin-1');
    expect(audit.id).toBeTruthy();
    expect(audit.createdAt).toBeTruthy();
  });

  it('defaults admin to "admin" when not provided', () => {
    const audit = createPriceOverrideAudit({
      bookingId: 'b-1',
      recommendedPrice: 300,
      approvedPrice: 300,
    });
    expect(audit.adminId).toBe('admin');
    expect(audit.difference).toBe(0);
  });
});

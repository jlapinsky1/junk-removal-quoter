import { describe, it, expect } from 'vitest';
import {
  inferQuantity,
  inferAccess,
  inferStairs,
  buildCommercialEstimate,
} from '../utils/commercialEstimateBuilder';

describe('commercialEstimateBuilder', () => {
  it('infers whole-property cleanout from description', () => {
    expect(inferQuantity('Full cleanout of office building common areas')).toBe('Whole house / cleanout');
  });

  it('infers unit turnover as room-sized job', () => {
    expect(inferQuantity('Unit 204 turnover after tenant move-out')).toBe('A room worth of stuff');
  });

  it('infers upstairs access from access notes', () => {
    const text = 'Third floor walk-up, no elevator';
    expect(inferAccess(text)).toBe('upstairs');
    expect(inferStairs(text)).toBe('multiple');
  });

  it('builds a recommended price for a commercial job', () => {
    const job = {
      id: 'test',
      description: 'Apartment unit cleanout — sofa, mattress, misc debris',
      accessNotes: 'Ground floor, curbside pickup',
      unit: '12B',
      photos: [{ kind: 'submission' }, { kind: 'submission' }, { kind: 'submission' }],
      property: { address: '123 Main St, Albany NY' },
    };

    const estimate = buildCommercialEstimate(job);
    expect(estimate.recommendedPrice).toBeGreaterThan(0);
    expect(estimate.estimatedProfit).toBeGreaterThan(0);
    expect(estimate.breakdown.length).toBeGreaterThan(0);
  });
});

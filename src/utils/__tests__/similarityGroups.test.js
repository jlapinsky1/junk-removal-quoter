import { describe, it, expect } from 'vitest';
import { groupJobsByDimension, categorizeDistance, categorizeVolume, getGroupSummary } from '../similarityGroups';

describe('groupJobsByDimension', () => {
  const jobs = [
    { access_type: 'Curbside', quantity: 'A few items (1-5)', internal_estimate: { estimatedVolumePct: 15 } },
    { access_type: 'Curbside', quantity: 'A room worth of stuff', internal_estimate: { estimatedVolumePct: 25 } },
    { access_type: 'Upstairs', quantity: 'A few items (1-5)', internal_estimate: { estimatedVolumePct: 15 } },
  ];

  it('groups by accessType', () => {
    const groups = groupJobsByDimension(jobs, 'accessType');
    expect(groups.get('Curbside')).toHaveLength(2);
    expect(groups.get('Upstairs')).toHaveLength(1);
  });

  it('groups by quantity', () => {
    const groups = groupJobsByDimension(jobs, 'quantity');
    expect(groups.get('A few items (1-5)')).toHaveLength(2);
    expect(groups.get('A room worth of stuff')).toHaveLength(1);
  });

  it('puts missing fields into unknown', () => {
    const jobs = [{ internal_estimate: {} }, { internal_estimate: {} }];
    const groups = groupJobsByDimension(jobs, 'accessType');
    expect(groups.get('unknown')).toHaveLength(2);
  });

  it('returns empty map for invalid dimension', () => {
    const groups = groupJobsByDimension(jobs, 'nonexistent');
    expect(groups.size).toBe(0);
  });
});

describe('categorizeDistance', () => {
  it('returns 0-10mi for short travel', () => {
    expect(categorizeDistance({ internal_estimate: { estimatedTravelMinutes: 15 } })).toBe('0-10mi');
  });

  it('returns 10-20mi for medium travel', () => {
    expect(categorizeDistance({ internal_estimate: { estimatedTravelMinutes: 35 } })).toBe('10-20mi');
  });

  it('returns 20-30mi for longer travel', () => {
    expect(categorizeDistance({ internal_estimate: { estimatedTravelMinutes: 50 } })).toBe('20-30mi');
  });

  it('returns 30+mi for long travel', () => {
    expect(categorizeDistance({ internal_estimate: { estimatedTravelMinutes: 80 } })).toBe('30+mi');
  });

  it('returns unknown when no data', () => {
    expect(categorizeDistance({ internal_estimate: {} })).toBe('unknown');
  });
});

describe('categorizeVolume', () => {
  it('returns light for small volume', () => {
    expect(categorizeVolume({ internal_estimate: { estimatedVolumePct: 15 } })).toBe('light (<25%)');
  });

  it('returns medium for mid volume', () => {
    expect(categorizeVolume({ internal_estimate: { estimatedVolumePct: 40 } })).toBe('medium (25-60%)');
  });

  it('returns heavy for large volume', () => {
    expect(categorizeVolume({ internal_estimate: { estimatedVolumePct: 80 } })).toBe('heavy (60%+)');
  });
});

describe('getGroupSummary', () => {
  it('summarizes a group', () => {
    const jobs = [
      { internal_estimate: { estimatedMargin: 0.70, estimatedProfit: 200 } },
      { internal_estimate: { estimatedMargin: 0.80, estimatedProfit: 300 } },
    ];
    const s = getGroupSummary(jobs);
    expect(s.count).toBe(2);
    expect(s.avgMargin).toBeCloseTo(0.75, 2);
    expect(s.avgProfit).toBe(250);
  });

  it('returns zero for empty array', () => {
    expect(getGroupSummary([]).count).toBe(0);
  });
});

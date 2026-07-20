import { describe, it, expect } from 'vitest';
import { checkCapacityCompatibility, suggestBatch } from '../batchingEngine';

describe('checkCapacityCompatibility', () => {
  it('compatible when combined volume <= 100%', () => {
    const existing = [
      { internal_estimate: { estimatedVolumePct: 15 } },
      { internal_estimate: { estimatedVolumePct: 25 } },
    ];
    const candidate = { internal_estimate: { estimatedVolumePct: 30 } };
    const result = checkCapacityCompatibility(existing, candidate);
    expect(result.compatible).toBe(true);
    expect(result.combinedVolumePct).toBe(70);
    expect(result.reason).toBeNull();
  });

  it('incompatible when combined volume > 100%', () => {
    const existing = [{ internal_estimate: { estimatedVolumePct: 75 } }];
    const candidate = { internal_estimate: { estimatedVolumePct: 50 } };
    const result = checkCapacityCompatibility(existing, candidate);
    expect(result.compatible).toBe(false);
    expect(result.combinedVolumePct).toBe(125);
    expect(result.reason).toContain('exceeds truck capacity');
  });

  it('handles missing volume estimates as 0', () => {
    const existing = [{ internal_estimate: {} }];
    const candidate = { internal_estimate: { estimatedVolumePct: 50 } };
    const result = checkCapacityCompatibility(existing, candidate);
    expect(result.compatible).toBe(true);
    expect(result.combinedVolumePct).toBe(50);
  });

  it('exactly 100% is compatible', () => {
    const existing = [{ internal_estimate: { estimatedVolumePct: 60 } }];
    const candidate = { internal_estimate: { estimatedVolumePct: 40 } };
    const result = checkCapacityCompatibility(existing, candidate);
    expect(result.compatible).toBe(true);
    expect(result.combinedVolumePct).toBe(100);
  });
});

describe('suggestBatch', () => {
  const candidateJob = {
    geocoded_lat: 33.749,
    geocoded_lng: -84.388,
    internal_estimate: { estimatedVolumePct: 20 },
  };

  const scheduledJobs = [
    {
      id: 'nearby-small',
      geocoded_lat: 33.750,
      geocoded_lng: -84.390,
      internal_estimate: { estimatedVolumePct: 25 },
    },
    {
      id: 'nearby-large',
      geocoded_lat: 33.755,
      geocoded_lng: -84.395,
      internal_estimate: { estimatedVolumePct: 90 },
    },
    {
      id: 'far-away',
      geocoded_lat: 34.500,
      geocoded_lng: -85.000,
      internal_estimate: { estimatedVolumePct: 10 },
    },
    {
      id: 'no-geo',
      geocoded_lat: null,
      geocoded_lng: null,
      internal_estimate: { estimatedVolumePct: 10 },
    },
  ];

  it('returns nearby jobs sorted by distance', () => {
    const results = suggestBatch(candidateJob, scheduledJobs);
    expect(results.length).toBe(2); // nearby-small and nearby-large within 15mi
    expect(results[0].scheduledJob.id).toBe('nearby-small');
    expect(results[1].scheduledJob.id).toBe('nearby-large');
  });

  it('marks capacity compatibility correctly', () => {
    const results = suggestBatch(candidateJob, scheduledJobs);
    const small = results.find(r => r.scheduledJob.id === 'nearby-small');
    const large = results.find(r => r.scheduledJob.id === 'nearby-large');
    expect(small.capacityCompatible).toBe(true);
    expect(small.combinedVolumePct).toBe(45);
    expect(large.capacityCompatible).toBe(false);
    expect(large.combinedVolumePct).toBe(110);
  });

  it('includes travel savings estimate', () => {
    const results = suggestBatch(candidateJob, scheduledJobs);
    expect(results[0].estimatedTravelSavings).toBeGreaterThan(0);
  });

  it('returns empty for candidate without geocoding', () => {
    const noGeo = { geocoded_lat: null, geocoded_lng: null, internal_estimate: {} };
    expect(suggestBatch(noGeo, scheduledJobs)).toEqual([]);
  });

  it('returns empty for empty scheduled list', () => {
    expect(suggestBatch(candidateJob, [])).toEqual([]);
  });

  it('respects custom radius', () => {
    const results = suggestBatch(candidateJob, scheduledJobs, { batchRadiusMiles: 0.5 });
    expect(results.length).toBe(1); // only the very closest
  });
});

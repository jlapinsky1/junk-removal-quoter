import { describe, it, expect } from 'vitest';
import { haversineDistance, findNearbyJobs, hashAddress } from '../routeContext';

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it('calculates known distance NYC to LA (~2451 mi)', () => {
    const dist = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(dist).toBeGreaterThan(2440);
    expect(dist).toBeLessThan(2460);
  });

  it('calculates short distance (~5 mi)', () => {
    // Two points roughly 5 miles apart in Atlanta area
    const dist = haversineDistance(33.749, -84.388, 33.794, -84.388);
    expect(dist).toBeGreaterThan(3);
    expect(dist).toBeLessThan(4);
  });
});

describe('hashAddress', () => {
  it('returns a 64-char hex string', async () => {
    const hash = await hashAddress('123 Main St, Atlanta, GA 30301');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('normalizes whitespace and punctuation', async () => {
    const h1 = await hashAddress('123 Main St., Atlanta, GA');
    const h2 = await hashAddress('123  main st  atlanta  GA');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different addresses', async () => {
    const h1 = await hashAddress('123 Main St');
    const h2 = await hashAddress('456 Oak Ave');
    expect(h1).not.toBe(h2);
  });
});

describe('findNearbyJobs', () => {
  const jobs = [
    { id: 'close', geocoded_lat: 33.750, geocoded_lng: -84.390 },
    { id: 'medium', geocoded_lat: 33.800, geocoded_lng: -84.400 },
    { id: 'far', geocoded_lat: 34.500, geocoded_lng: -85.000 },
    { id: 'no-geo', geocoded_lat: null, geocoded_lng: null },
  ];

  it('returns jobs within radius sorted by distance', () => {
    const results = findNearbyJobs(33.749, -84.388, jobs, 15);
    expect(results.length).toBe(2); // close and medium
    expect(results[0].job.id).toBe('close');
    expect(results[1].job.id).toBe('medium');
    expect(results[0].distanceMiles).toBeLessThan(results[1].distanceMiles);
  });

  it('excludes jobs outside radius', () => {
    const results = findNearbyJobs(33.749, -84.388, jobs, 1);
    expect(results.length).toBe(1);
    expect(results[0].job.id).toBe('close');
  });

  it('skips jobs without geocoded coordinates', () => {
    const results = findNearbyJobs(33.749, -84.388, jobs, 100);
    const ids = results.map(r => r.job.id);
    expect(ids).not.toContain('no-geo');
  });

  it('returns empty for null target', () => {
    expect(findNearbyJobs(null, null, jobs)).toEqual([]);
  });

  it('returns empty for empty job list', () => {
    expect(findNearbyJobs(33.749, -84.388, [])).toEqual([]);
  });
});

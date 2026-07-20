import { describe, it, expect } from 'vitest';
import { scoreRoute, compareScenarios, optimizeStopOrder } from '../routeScoring';

describe('scoreRoute', () => {
  const home = { lat: 33.749, lng: -84.388, type: 'home' };
  const job1 = { lat: 33.760, lng: -84.400, type: 'job', estimatedOnSiteMinutes: 60 };
  const landfill = { lat: 33.780, lng: -84.420, type: 'landfill' };

  it('calculates totals for a simple route', () => {
    const result = scoreRoute([home, job1, landfill, home]);
    expect(result.totalMiles).toBeGreaterThan(0);
    expect(result.travelMinutes).toBeGreaterThan(0);
    expect(result.onSiteMinutes).toBe(60);
    expect(result.totalMinutes).toBe(result.travelMinutes + result.onSiteMinutes);
    expect(result.fuelCost).toBeGreaterThan(0);
    expect(result.dumpTrips).toBe(1);
    expect(result.dumpFees).toBe(75);
    expect(result.stops).toHaveLength(4);
  });

  it('first stop has zero leg distance', () => {
    const result = scoreRoute([home, job1]);
    expect(result.stops[0].legMiles).toBe(0);
    expect(result.stops[0].legMinutes).toBe(0);
  });

  it('uses custom settings', () => {
    const result = scoreRoute([home, job1, landfill, home], {
      costPerMile: 1.0,
      dumpFee: 100,
    });
    expect(result.fuelCost).toBe(result.totalMiles * 1.0);
    expect(result.dumpFees).toBe(100);
  });

  it('counts multiple dump trips', () => {
    const result = scoreRoute([home, job1, landfill, job1, landfill, home]);
    expect(result.dumpTrips).toBe(2);
    expect(result.dumpFees).toBe(150);
  });
});

describe('compareScenarios', () => {
  it('picks scenario with higher net profit', () => {
    const a = { expectedProfit: 300, fuelCost: 20, dumpFees: 75, totalMiles: 30, totalMinutes: 120 };
    const b = { expectedProfit: 250, fuelCost: 15, dumpFees: 75, totalMiles: 20, totalMinutes: 100 };
    const result = compareScenarios(a, b);
    expect(result.winner).toBe('A'); // net A = 205, net B = 160
  });

  it('accounts for dump fee differences', () => {
    const a = { expectedProfit: 300, fuelCost: 20, dumpFees: 150, totalMiles: 30, totalMinutes: 120 };
    const b = { expectedProfit: 300, fuelCost: 20, dumpFees: 75, totalMiles: 30, totalMinutes: 120 };
    const result = compareScenarios(a, b);
    expect(result.winner).toBe('B');
    expect(result.savings.dumpFees).toBe(75);
  });

  it('returns tie for similar net profit', () => {
    const a = { expectedProfit: 200, fuelCost: 20, dumpFees: 75, totalMiles: 30, totalMinutes: 120 };
    const b = { expectedProfit: 200, fuelCost: 20, dumpFees: 75, totalMiles: 30, totalMinutes: 120 };
    const result = compareScenarios(a, b);
    expect(result.winner).toBe('tie');
  });

  it('includes mile savings in reasons', () => {
    const a = { expectedProfit: 200, fuelCost: 30, dumpFees: 75, totalMiles: 50, totalMinutes: 150 };
    const b = { expectedProfit: 200, fuelCost: 10, dumpFees: 75, totalMiles: 15, totalMinutes: 90 };
    const result = compareScenarios(a, b);
    expect(result.reasons.some(r => r.includes('saves'))).toBe(true);
    expect(result.savings.miles).toBeGreaterThan(0);
  });
});

describe('optimizeStopOrder', () => {
  const home = { lat: 33.749, lng: -84.388 };
  const landfill = { lat: 33.800, lng: -84.450 };

  it('returns just home for empty stops', () => {
    const route = optimizeStopOrder([], home);
    expect(route).toHaveLength(1);
    expect(route[0].type).toBe('home');
  });

  it('creates home → job → home route for single stop', () => {
    const stops = [{ lat: 33.760, lng: -84.400, type: 'job' }];
    const route = optimizeStopOrder(stops, home);
    expect(route).toHaveLength(3);
    expect(route[0].type).toBe('home');
    expect(route[1].type).toBe('job');
    expect(route[2].type).toBe('home');
  });

  it('adds landfill before return home', () => {
    const stops = [{ lat: 33.760, lng: -84.400, type: 'job' }];
    const route = optimizeStopOrder(stops, home, landfill);
    expect(route).toHaveLength(4);
    expect(route[2].type).toBe('landfill');
    expect(route[3].type).toBe('home');
  });

  it('orders 3 stops by nearest-neighbor', () => {
    // Stop A is closest to home, C is closest to A, B is closest to C
    const stops = [
      { lat: 33.900, lng: -84.500, type: 'job', id: 'B' },  // far from home
      { lat: 33.755, lng: -84.392, type: 'job', id: 'A' },  // close to home
      { lat: 33.850, lng: -84.460, type: 'job', id: 'C' },  // between A and B
    ];
    const route = optimizeStopOrder(stops, home);
    // Should visit A first (closest to home)
    expect(route[1].id).toBe('A');
    // Then C (closer to A than B)
    expect(route[2].id).toBe('C');
    // Then B
    expect(route[3].id).toBe('B');
  });
});

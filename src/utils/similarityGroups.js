/**
 * Similarity dimensions for grouping completed jobs.
 * Each dimension maps a booking to a categorical value.
 */
export const SIMILARITY_DIMENSIONS = {
  accessType: {
    label: 'Access Type',
    extract: (b) => b.access_type || b.accessType || 'unknown',
  },
  quantity: {
    label: 'Quantity',
    extract: (b) => b.quantity || 'unknown',
  },
  heavyItems: {
    label: 'Heavy Items',
    extract: (b) => {
      const est = b.internal_estimate;
      if (!est) return 'unknown';
      return est.hasHeavyItems || est.weightRisk ? 'yes' : 'no';
    },
  },
  stairs: {
    label: 'Stairs',
    extract: (b) => b.stairs || 'none',
  },
  distanceBand: {
    label: 'Distance',
    extract: (b) => categorizeDistance(b),
  },
  volumeBand: {
    label: 'Volume',
    extract: (b) => categorizeVolume(b),
  },
  loadCount: {
    label: 'Load Count',
    extract: (b) => {
      const est = b.internal_estimate;
      return String(est?.numberOfDumpLoads || 1);
    },
  },
};

/**
 * Categorize a booking by estimated travel distance.
 */
export function categorizeDistance(booking) {
  const est = booking.internal_estimate;
  const travel = est?.estimatedTravelMinutes;
  if (travel == null) return 'unknown';
  // Rough approximation: 30mph average → minutes ≈ 2 * miles
  if (travel <= 20) return '0-10mi';
  if (travel <= 40) return '10-20mi';
  if (travel <= 60) return '20-30mi';
  return '30+mi';
}

/**
 * Categorize a booking by estimated truck volume.
 */
export function categorizeVolume(booking) {
  const est = booking.internal_estimate;
  const vol = est?.estimatedVolumePct;
  if (vol == null) return 'unknown';
  if (vol < 25) return 'light (<25%)';
  if (vol <= 60) return 'medium (25-60%)';
  return 'heavy (60%+)';
}

/**
 * Group completed jobs by a dimension.
 * @returns {Map<string, Array>} group value → array of bookings
 */
export function groupJobsByDimension(completedJobs, dimensionKey) {
  const dim = SIMILARITY_DIMENSIONS[dimensionKey];
  if (!dim) return new Map();

  const groups = new Map();
  for (const job of completedJobs) {
    const key = dim.extract(job);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(job);
  }
  return groups;
}

/**
 * Summarize a group of jobs.
 */
export function getGroupSummary(jobs) {
  if (!jobs.length) return { count: 0 };

  let totalMargin = 0;
  let totalProfit = 0;
  let counted = 0;

  for (const job of jobs) {
    const est = job.internal_estimate;
    if (est) {
      totalMargin += est.estimatedMargin || 0;
      totalProfit += est.estimatedProfit || 0;
      counted++;
    }
  }

  return {
    count: jobs.length,
    avgMargin: counted > 0 ? totalMargin / counted : 0,
    avgProfit: counted > 0 ? totalProfit / counted : 0,
  };
}

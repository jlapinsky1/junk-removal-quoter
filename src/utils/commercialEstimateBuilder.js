import { buildEstimate } from './estimateBuilder';

function combinedJobText(job) {
  return [
    job.description,
    job.accessNotes,
    job.property?.notes,
    job.unit ? `unit ${job.unit}` : '',
  ].filter(Boolean).join('\n');
}

function countSubmissionPhotos(job) {
  const photos = job.photos || [];
  const submission = photos.filter((p) => p.kind === 'submission');
  return submission.length || photos.length;
}

const ITEM_KEYWORDS = [
  { pattern: /mattress/, item: 'mattress' },
  { pattern: /\b(couch|sofa)\b/, item: 'couch' },
  { pattern: /\b(refrigerator|fridge)\b/, item: 'refrigerator' },
  { pattern: /\b(washer|dryer)\b/, item: 'washer' },
  { pattern: /\b(dresser|desk|table|chair)\b/, item: 'furniture' },
  { pattern: /\b(treadmill|elliptical)\b/, item: 'treadmill' },
];

export function extractItemsFromText(text) {
  const t = text.toLowerCase();
  const items = [];
  for (const { pattern, item } of ITEM_KEYWORDS) {
    if (pattern.test(t)) items.push({ item, quantity: 1 });
  }
  return items;
}

/**
 * Infer residential-style quantity bucket from commercial job text.
 */
export function inferQuantity(text, photoCount = 0) {
  const t = text.toLowerCase();

  if (
    /single item|one item|one mattress|mattress removal|mattress only|just a mattress|only a mattress|basic mattress|single mattress/.test(t)
  ) {
    return 'Single item';
  }
  if (/\bmattress\b/.test(t) && !/multiple|several|\d+\s*mattress/.test(t)) {
    return 'Single item';
  }
  if (/\b(couch|sofa|refrigerator|fridge|washer|dryer)\b/.test(t) && !/multiple|several|and more|plus/.test(t)) {
    return 'Single item';
  }

  if (
    /whole (building|property|house|site)|full cleanout|major cleanout|multiple units|several units|bulk cleanout|construction debris|demo(lition)?|renovation/.test(t)
  ) {
    return 'Whole house / cleanout';
  }
  if (
    /multiple rooms|several rooms|large cleanout|heavy load|full truck|office cleanout|common area|hallway|lobby/.test(t)
  ) {
    return 'Multiple rooms';
  }
  if (
    /room worth|single unit|unit turnover|unit cleanout|turnover|apartment|one room|studio|1[- ]?bed|2[- ]?bed|condo|suite/.test(t)
  ) {
    return 'A room worth of stuff';
  }
  if (photoCount >= 8) return 'Multiple rooms';
  if (photoCount >= 4) return 'A room worth of stuff';

  return 'A few items (1-5)';
}

export function inferAccess(text, quantity) {
  const t = text.toLowerCase();

  if (/curbside|already outside|dumpster|loading dock|dock|roll[- ]?off/.test(t)) return 'curbside';
  if (/garage|driveway|parking lot|parking garage/.test(t)) return 'garage';
  if (/upstairs|second floor|third floor|4th floor|5th floor|walk[- ]?up|no elevator/.test(t)) {
    return 'upstairs';
  }
  if (/basement|downstairs|lower level/.test(t)) return 'basement';
  if (/first floor|ground floor|inside|interior|unit/.test(t)) return 'first_floor';

  if (quantity === 'Single item') return 'curbside';

  return 'first_floor';
}

export function inferStairs(text) {
  const t = text.toLowerCase();

  if (/multiple flights|several flights|walk[- ]?up|no elevator|4th floor|5th floor|6th floor/.test(t)) {
    return 'multiple';
  }
  if (/one flight|stairs|second floor|2nd floor|3rd floor|stairwell/.test(t)) return 'one_flight';
  if (/elevator|ground floor|first floor|no stairs/.test(t)) return 'none';

  return 'none';
}

/**
 * Map a commercial job detail payload to the booking shape used by buildEstimate().
 */
export function commercialJobToBookingShape(job) {
  const text = combinedJobText(job);
  const photoCount = countSubmissionPhotos(job);
  const quantity = inferQuantity(text, photoCount);

  return {
    id: job.id,
    quantity,
    accessType: inferAccess(text, quantity),
    stairs: inferStairs(text),
    description: text,
    detectedItems: extractItemsFromText(text),
    photoCount,
    fullAddress: job.property?.address || '',
    preferredDate: job.preferredDate,
    travelMinutes: job.travelMinutes ?? null,
    distanceMiles: job.distanceMiles ?? null,
    geocodingStatus: job.travelMinutes != null ? 'success' : null,
  };
}

export function buildCommercialEstimate(job, settingsOverride) {
  return buildEstimate(commercialJobToBookingShape(job), settingsOverride);
}

export function roundToNearest5(n) {
  return Math.round(n / 5) * 5;
}

const SMALL_CURBSIDE_LOADS = [
  'Single item curbside',
  'Small curbside pile',
  'Couch + small curbside pile',
];

const SMALL_LOADS = [
  ...SMALL_CURBSIDE_LOADS,
  'Normal small job',
];

const EASY_ACCESS_TYPES = [
  'Curbside / already outside',
  'Garage / driveway',
];

const DISQUALIFYING_ADDONS = [
  'Heavy item',
  'Stairs',
  'Same-day / urgent',
];

function isEligibleForDiscount(loadSize, accessType, addOns) {
  if (!SMALL_CURBSIDE_LOADS.includes(loadSize)) return false;
  if (!EASY_ACCESS_TYPES.includes(accessType)) return false;
  if (addOns.some(a => DISQUALIFYING_ADDONS.includes(a))) return false;
  return true;
}

export function calculateQuote(formData, settings) {
  const {
    loadSize,
    numberOfDumpLoads = 1,
    accessType = 'Curbside / already outside',
    priceSensitivity = 'balanced',
    addOns = [],
    homeBaseToJob = 0,
    jobToLandfill = 0,
    landfillToHomeBase = 0,
    estimatedJobTime = 0,
    customBasePrice,
  } = formData;

  const { mpg, gasPrice, dumpFee, minimumPrice, basePrices, addOnPrices, distanceSurcharges, accessModifiers, priceSensitivity: sensitivitySettings } = settings;

  // Base price
  let basePrice = 0;
  if (loadSize === 'Oversized / custom') {
    basePrice = Number(customBasePrice) || 0;
  } else {
    basePrice = basePrices[loadSize]?.default || 0;
  }

  // Access modifier
  const accessModifier = accessModifiers[accessType] || 0;

  // Add-ons total
  const addOnsTotal = addOns.reduce((sum, addon) => sum + (addOnPrices[addon] || 0), 0);

  // Distance surcharge (based on job-to-landfill leg)
  // At exactly 10.0 miles: $0. Above 10.0: next tier.
  const jobToLandfillMiles = Number(jobToLandfill) || 0;
  let distanceSurcharge = 0;
  let distanceWarning = false;
  for (const tier of distanceSurcharges) {
    const upperBound = tier.max === Infinity ? Infinity : tier.max;
    if (jobToLandfillMiles >= tier.min && jobToLandfillMiles <= upperBound) {
      distanceSurcharge = tier.surcharge;
      break;
    }
  }
  if (jobToLandfillMiles >= 40) {
    distanceWarning = true;
  }

  // Price sensitivity adjustment
  let sensitivityAdjustment = 0;
  const eligible = isEligibleForDiscount(loadSize, accessType, addOns);
  if (priceSensitivity === 'win') {
    if (eligible) {
      sensitivityAdjustment = -(sensitivitySettings?.winTheJobDiscount || 25);
    }
  } else if (priceSensitivity === 'protect') {
    if (SMALL_LOADS.includes(loadSize)) {
      sensitivityAdjustment = sensitivitySettings?.protectMarginSmall || 25;
    } else if (loadSize !== 'Oversized / custom') {
      sensitivityAdjustment = sensitivitySettings?.protectMarginLarge || 50;
    }
  }

  // Total route: home -> job -> landfill -> home
  const homeToJobMiles = Number(homeBaseToJob) || 0;
  const landfillToHomeMiles = Number(landfillToHomeBase) || 0;
  const totalRouteMiles = homeToJobMiles + jobToLandfillMiles + landfillToHomeMiles;
  const fuelCost = (totalRouteMiles / mpg) * gasPrice;
  const dumpCost = dumpFee * Number(numberOfDumpLoads);
  const directCost = dumpCost + fuelCost;

  // Quote calculation
  const quoteSubtotal = basePrice + accessModifier + addOnsTotal + distanceSurcharge + sensitivityAdjustment;
  const suggestedQuote = roundToNearest5(Math.max(quoteSubtotal, minimumPrice));

  // Profitability
  const estimatedGrossProfit = suggestedQuote - directCost;
  const estimatedMargin = suggestedQuote > 0 ? estimatedGrossProfit / suggestedQuote : 0;
  const hours = Number(estimatedJobTime) || 0;
  const grossProfitPerHour = hours > 0 ? estimatedGrossProfit / hours : null;

  let profitabilityStatus = 'green';
  if (estimatedMargin < 0.60) {
    profitabilityStatus = 'red';
  } else if (estimatedMargin < 0.75) {
    profitabilityStatus = 'yellow';
  }

  return {
    basePrice: roundToNearest5(basePrice),
    accessModifier,
    addOnsTotal: roundToNearest5(addOnsTotal),
    distanceSurcharge,
    sensitivityAdjustment,
    priceSensitivity,
    homeToJobMiles,
    jobToLandfillMiles,
    landfillToHomeMiles,
    totalRouteMiles,
    fuelCost: Math.round(fuelCost * 100) / 100,
    dumpCost,
    directCost: Math.round(directCost * 100) / 100,
    quoteSubtotal: roundToNearest5(quoteSubtotal),
    suggestedQuote,
    estimatedGrossProfit: roundToNearest5(estimatedGrossProfit),
    estimatedMargin,
    grossProfitPerHour: grossProfitPerHour !== null ? roundToNearest5(grossProfitPerHour) : null,
    profitabilityStatus,
    distanceWarning,
  };
}

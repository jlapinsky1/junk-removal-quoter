export function roundToNearest5(n) {
  return Math.round(n / 5) * 5;
}

export function calculateQuote(formData, settings) {
  const {
    loadSize,
    numberOfDumpLoads = 1,
    difficulty,
    addOns = [],
    homeBaseToJob = 0,
    jobToLandfill = 0,
    landfillToHomeBase = 0,
    customBasePrice,
  } = formData;

  const { mpg, gasPrice, dumpFee, minimumPrice, basePrices, addOnPrices, distanceSurcharges, difficultyModifiers } = settings;

  // Base price
  let basePrice = 0;
  if (loadSize === 'Oversized / custom') {
    basePrice = Number(customBasePrice) || 0;
  } else {
    basePrice = basePrices[loadSize]?.default || 0;
  }

  // Add-ons total
  const addOnsTotal = addOns.reduce((sum, addon) => sum + (addOnPrices[addon] || 0), 0);

  // Distance surcharge (based on job-to-landfill leg)
  const jobToLandfillMiles = Number(jobToLandfill) || 0;
  let distanceSurcharge = 0;
  let distanceWarning = false;
  for (const tier of distanceSurcharges) {
    if (jobToLandfillMiles >= tier.min && jobToLandfillMiles < tier.max) {
      distanceSurcharge = tier.surcharge;
      break;
    }
  }
  if (jobToLandfillMiles >= 40) {
    distanceWarning = true;
  }

  // Difficulty modifier
  const difficultyModifier = difficultyModifiers[difficulty] || 0;

  // Total route: home -> job -> landfill -> home
  const homeToJobMiles = Number(homeBaseToJob) || 0;
  const landfillToHomeMiles = Number(landfillToHomeBase) || 0;
  const totalRouteMiles = homeToJobMiles + jobToLandfillMiles + landfillToHomeMiles;
  const fuelCost = (totalRouteMiles / mpg) * gasPrice;
  const dumpCost = dumpFee * Number(numberOfDumpLoads);
  const directCost = dumpCost + fuelCost;

  // Quote calculation
  const quoteSubtotal = basePrice + addOnsTotal + distanceSurcharge + difficultyModifier;
  const suggestedQuote = roundToNearest5(Math.max(quoteSubtotal, minimumPrice));

  // Profitability
  const estimatedGrossProfit = suggestedQuote - directCost;
  const estimatedMargin = suggestedQuote > 0 ? estimatedGrossProfit / suggestedQuote : 0;

  let profitabilityStatus = 'green';
  if (estimatedMargin < 0.60) {
    profitabilityStatus = 'red';
  } else if (estimatedMargin < 0.75) {
    profitabilityStatus = 'yellow';
  }

  return {
    basePrice: roundToNearest5(basePrice),
    addOnsTotal: roundToNearest5(addOnsTotal),
    distanceSurcharge,
    difficultyModifier,
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
    profitabilityStatus,
    distanceWarning,
  };
}

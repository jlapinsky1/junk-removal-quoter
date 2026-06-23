export function roundToNearest5(n) {
  return Math.round(n / 5) * 5;
}

export function calculateQuote(formData, settings) {
  const {
    loadSize,
    numberOfDumpLoads = 1,
    difficulty,
    addOns = [],
    distanceToLandfill = 0,
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

  // Distance surcharge
  const miles = Number(distanceToLandfill) || 0;
  let distanceSurcharge = 0;
  let distanceWarning = false;
  for (const tier of distanceSurcharges) {
    if (miles >= tier.min && miles < tier.max) {
      distanceSurcharge = tier.surcharge;
      break;
    }
  }
  if (miles >= 40) {
    distanceWarning = true;
  }

  // Difficulty modifier
  const difficultyModifier = difficultyModifiers[difficulty] || 0;

  // Disposal costs
  const disposalRouteMiles = miles * 2;
  const fuelCost = (disposalRouteMiles / mpg) * gasPrice;
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
    disposalRouteMiles,
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

/**
 * Creates an immutable snapshot of an approved quote.
 *
 * Once created, this snapshot must never be modified by later
 * settings changes. It records the exact state at approval time.
 */
export function createQuoteSnapshot({
  bookingId,
  version,
  approvedPrice,
  recommendedPrice,
  estimate,
  settings,
  availableSlots,
  expiresAt,
  adminOverride,
}) {
  const snapshot = {
    snapshotId: crypto.randomUUID(),
    bookingId,
    version,
    createdAt: new Date().toISOString(),

    // Pricing
    approvedPrice,
    recommendedPrice,

    // Full estimate frozen at approval time
    estimateSnapshot: {
      estimatedProfit: estimate.estimatedProfit,
      estimatedMargin: estimate.estimatedMargin,
      estimatedDirectCost: estimate.estimatedDirectCost,
      estimatedTravelMinutes: estimate.estimatedTravelMinutes,
      estimatedOnSiteHours: estimate.estimatedOnSiteHours,
      estimatedVolumePct: estimate.estimatedVolumePct,
      loadSize: estimate.loadSize,
      accessType: estimate.accessType,
      addOns: [...estimate.addOns],
      breakdown: estimate.breakdown.map(b => ({ ...b })),
      numberOfDumpLoads: estimate.numberOfDumpLoads,
      laborAllowance: estimate.laborAllowance,
      disposalAllowance: estimate.disposalAllowance,
      estimatedFuelCost: estimate.estimatedFuelCost,
      targetMargin: estimate.targetMargin,
      missingInputs: estimate.missingInputs.map(m => ({ ...m })),
      weightRisk: estimate.weightRisk,
      weightRiskReason: estimate.weightRiskReason,
    },

    // Settings frozen at approval time (pricing-relevant only)
    settingsSnapshot: {
      dumpFee: settings.dumpFee,
      minimumPrice: settings.minimumPrice,
      mpg: settings.mpg,
      gasPrice: settings.gasPrice,
      basePrices: JSON.parse(JSON.stringify(settings.basePrices)),
      addOnPrices: { ...settings.addOnPrices },
      accessModifiers: { ...settings.accessModifiers },
      distanceSurcharges: settings.distanceSurcharges.map(t => ({ ...t })),
    },

    // Scheduling
    availableSlots: [...(availableSlots || [])],
    expiresAt,

    // Customer-facing terms (shown on quote page)
    customerTerms: CUSTOMER_TERMS,

    // Audit: override record if approved != recommended
    adminOverride: adminOverride || null,
  };

  return Object.freeze(snapshot);
}

/**
 * Standard customer-facing terms attached to every quote.
 */
export const CUSTOMER_TERMS = {
  priceAdjustmentNotice:
    'This quote is based on the photos and job details submitted. The price may be adjusted if the items, volume, materials, weight, or access conditions differ substantially upon arrival. Any change will be reviewed with you before work begins.',
  included: [
    'Professional loading & hauling',
    'All labor included',
    'Responsible disposal & recycling',
    'Cleanup of the pickup area',
    'All dump fees included',
  ],
  excluded: [
    'Hazardous materials, chemicals, and paint',
  ],
  customerConfirmations: [
    'The photos I submitted represent everything being removed.',
    'I have disclosed all stairs, access issues, and unusually heavy items.',
    'I understand that additional or undisclosed items may require a revised quote.',
  ],
};

/**
 * Creates an audit record when approved price differs from recommended.
 */
export function createPriceOverrideAudit({
  bookingId,
  recommendedPrice,
  approvedPrice,
  reason,
  adminId,
}) {
  return {
    id: crypto.randomUUID(),
    bookingId,
    recommendedPrice,
    approvedPrice,
    difference: approvedPrice - recommendedPrice,
    percentDifference: recommendedPrice > 0
      ? ((approvedPrice - recommendedPrice) / recommendedPrice * 100).toFixed(1)
      : null,
    reason: reason || '',
    adminId: adminId || 'admin',
    createdAt: new Date().toISOString(),
  };
}

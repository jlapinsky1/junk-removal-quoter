import React from 'react';

const marginColors = {
  green: 'bg-green-100 border-green-500 text-green-800',
  yellow: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  red: 'bg-red-100 border-red-500 text-red-800',
};

const marginLabels = {
  green: 'Good Margin',
  yellow: 'Marginal',
  red: 'LOW MARGIN - Review!',
};

export default function InternalQuoteView({ formData, quoteResult }) {
  const {
    basePrice, addOnsTotal, distanceSurcharge, difficultyModifier,
    disposalRouteMiles, fuelCost, dumpCost, directCost,
    suggestedQuote, estimatedGrossProfit, estimatedMargin,
    profitabilityStatus, distanceWarning,
  } = quoteResult;

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg border-2 ${marginColors[profitabilityStatus]}`}>
        <div className="text-center">
          <div className="text-3xl font-bold">${suggestedQuote}</div>
          <div className="text-sm font-medium mt-1">{marginLabels[profitabilityStatus]}</div>
          <div className="text-sm">{(estimatedMargin * 100).toFixed(0)}% margin</div>
        </div>
      </div>

      {distanceWarning && (
        <div className="p-3 bg-orange-100 border border-orange-400 rounded-lg text-orange-800 text-sm font-medium">
          40+ miles from landfill - Review manually! Consider increasing quote.
        </div>
      )}

      {profitabilityStatus === 'red' && (
        <div className="p-3 bg-red-100 border border-red-400 rounded-lg text-red-800 text-sm font-medium">
          Low margin job. Consider raising the price or declining.
        </div>
      )}

      <div className="bg-white rounded-lg border p-4 space-y-2">
        <h3 className="font-bold text-gray-700 border-b pb-1">Quote Breakdown</h3>
        <Row label="Base price" value={`$${basePrice}`} />
        <Row label="Add-ons" value={`$${addOnsTotal}`} />
        <Row label="Distance surcharge" value={`$${distanceSurcharge}`} />
        <Row label="Difficulty modifier" value={`$${difficultyModifier}`} />
        <div className="border-t pt-2 font-bold">
          <Row label="Suggested Quote" value={`$${suggestedQuote}`} />
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-2">
        <h3 className="font-bold text-gray-700 border-b pb-1">Cost Analysis (Internal)</h3>
        <Row label="Distance to landfill" value={`${formData.distanceToLandfill} mi`} />
        <Row label={`Disposal route (round trip)`} value={`${disposalRouteMiles} mi`} />
        <Row label="Fuel cost" value={`$${fuelCost.toFixed(2)}`} />
        <Row label={`Dump fee (x${formData.numberOfDumpLoads})`} value={`$${dumpCost}`} />
        <Row label="Total direct cost" value={`$${directCost.toFixed(2)}`} bold />
        <div className="border-t pt-2">
          <Row label="Estimated gross profit" value={`$${estimatedGrossProfit}`} bold />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-xs">
        Do not undercharge full truck/trailer jobs. Customer is paying for labor, truck, convenience, disposal, risk, and speed — not just dump fees.
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-bold' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span>{value}</span>
    </div>
  );
}

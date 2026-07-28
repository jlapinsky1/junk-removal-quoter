import React from 'react';

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(cents) {
  if (cents == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function CompletedJobCard({ booking, onClick }) {
  const {
    customerName,
    bookingRef,
    fullAddress,
    completedAt,
    finalAmountCents,
    financiallyCompletedAt,
    technicianName,
    beforePhotoCount,
    afterPhotoCount,
  } = booking;

  const isPaid = financiallyCompletedAt != null;
  const completionDate = formatDate(completedAt);
  const amount = formatCurrency(finalAmountCents);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          {/* Name + ref + badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">
              {customerName || 'Customer name unavailable'}
            </span>
            <span className="text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
              {bookingRef}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPaid
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {isPaid ? 'Paid' : 'Balance Due'}
            </span>
          </div>

          {/* Address */}
          <div className="text-sm text-gray-600 truncate">
            {fullAddress || 'Address unavailable'}
          </div>

          {/* Completion date + amount */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {completionDate && <span>Completed {completionDate}</span>}
            {amount && (
              <span className="font-semibold text-gray-700">{amount}</span>
            )}
            {technicianName && <span>{technicianName}</span>}
          </div>

          {/* Photo counts */}
          {(beforePhotoCount > 0 || afterPhotoCount > 0) && (
            <div className="text-xs text-gray-400">
              {beforePhotoCount} before / {afterPhotoCount} after photos
            </div>
          )}
        </div>

        <svg className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

import React from 'react';
import StatusActionButton from './StatusActionButton';

const STATUS_LABELS = {
  scheduled:   'Scheduled',
  en_route:    'En Route',
  arrived:     'Arrived',
  in_progress: 'In Progress',
  completed:   'Completed',
};

export default function NextJobCard({ job, onStatusAction, onSelectJob, statusLoading }) {
  if (!job) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
        <p className="text-gray-400 text-base">No jobs scheduled for today.</p>
      </div>
    );
  }

  const {
    id, bookingRef, status, depositConfirmed, crewBeforePhotoCount,
    appointmentWindow, customerName, fullAddress,
  } = job;

  const shortAddress = fullAddress?.split(',').slice(0, 2).join(',') ?? '';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Next Job</p>
          <p className="text-xs text-gray-500 mt-0.5">{appointmentWindow ?? 'Time TBD'}</p>
        </div>
        <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded-full">
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      {/* Customer info */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{customerName}</h2>
        <p className="text-gray-600 mt-0.5">{shortAddress}</p>
        <p className="text-xs text-gray-400 mt-1">{bookingRef}</p>
      </div>

      {/* Deposit indicator */}
      <div className={`text-xs font-medium px-3 py-1.5 rounded-full inline-block ${
        depositConfirmed
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'
      }`}>
        {depositConfirmed ? 'Deposit confirmed' : 'Deposit pending'}
      </div>

      {/* Primary action */}
      <StatusActionButton
        status={status}
        depositConfirmed={depositConfirmed}
        crewBeforePhotoCount={crewBeforePhotoCount ?? 0}
        onAction={() => onStatusAction?.(id, status)}
        loading={statusLoading}
      />

      {/* View Details */}
      <button
        onClick={() => onSelectJob?.(id)}
        className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
      >
        View Job Details
      </button>
    </div>
  );
}

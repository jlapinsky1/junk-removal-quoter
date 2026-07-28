import React from 'react';
import PhotoGallery from './PhotoGallery';

function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function CompletionPackagePanel({ completion, photos, bookingId }) {
  if (!completion) {
    return (
      <div className="text-sm text-gray-400 py-2">
        No completion package on record.
      </div>
    );
  }

  const completedStr = formatDateTime(completion.completedAt);

  return (
    <div className="space-y-5">
      {/* Photos */}
      <PhotoGallery before={photos?.before || []} after={photos?.after || []} />

      {/* Completion details */}
      <div className="space-y-3 text-sm">
        {completion.technicianName && (
          <DetailRow label="Technician" value={completion.technicianName} />
        )}
        {completedStr && (
          <DetailRow label="Completed" value={completedStr} />
        )}
        {completion.itemsRemoved && (
          <DetailRow label="Items removed" value={completion.itemsRemoved} multiline />
        )}
        {completion.volumeEstimate && (
          <DetailRow label="Volume / load size" value={completion.volumeEstimate} />
        )}
        {completion.completionNotes && (
          <DetailRow label="Completion notes" value={completion.completionNotes} multiline />
        )}
        {completion.disposalNotes && (
          <DetailRow label="Disposal / donation" value={completion.disposalNotes} multiline />
        )}
        {completion.priceAdjustmentReason && (
          <DetailRow label="Price adjustment reason" value={completion.priceAdjustmentReason} multiline />
        )}
      </div>

      {/* PDF download */}
      <a
        href={`/api/residential-completion-pdf?bookingId=${encodeURIComponent(bookingId)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download Completion Report
      </a>
    </div>
  );
}

function DetailRow({ label, value, multiline }) {
  return (
    <div className={multiline ? 'space-y-1' : 'flex justify-between gap-4'}>
      <span className="text-gray-500 font-medium flex-shrink-0">{label}</span>
      <span className="text-gray-800 text-right">{value}</span>
    </div>
  );
}

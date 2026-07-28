import React, { useState } from 'react';

const EVENT_LABELS = {
  booking_created:          'Request submitted',
  quote_approved:           'Quote approved by admin',
  price_override:           'Price override applied',
  blocker_override:         'Blocker override',
  quote_revised:            'Quote revised',
  quote_accepted:           'Quote accepted by customer',
  slot_reserved:            'Job scheduled',
  slot_canceled:            'Schedule canceled',
  booking_completed:        'Job completed',
  booking_declined:         'Booking declined',
  status_changed:           'Status updated',
  token_revoked:            'Access link updated',
  deposit_initiated:        'Deposit payment initiated',
  deposit_confirmed:        'Deposit paid',
  deposit_failed:           'Deposit payment failed',
  final_payment_requested:  'Final payment link sent',
  final_payment_confirmed:  'Final payment received',
  dispatch_override:        'Dispatch override',
  invoice_adjusted:         'Invoice adjusted',
  stripe_reconciled:        'Stripe reconciled',
  invoice_voided:           'Invoice voided',
  support_note_added:       'Support note added',
};

// Events that are shown by default (primary milestones)
const PRIMARY_EVENTS = new Set([
  'booking_created',
  'quote_approved',
  'quote_accepted',
  'deposit_confirmed',
  'slot_reserved',
  'booking_completed',
  'final_payment_requested',
  'final_payment_confirmed',
  'support_note_added',
]);

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function SupportTimeline({ events = [] }) {
  const [showAll, setShowAll] = useState(false);

  if (events.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-2">
        No timeline events recorded.
      </div>
    );
  }

  const primary = events.filter(e => PRIMARY_EVENTS.has(e.eventType));
  const secondary = events.filter(e => !PRIMARY_EVENTS.has(e.eventType));
  const shown = showAll ? events : primary;

  return (
    <div className="space-y-0">
      {shown.map((event, i) => (
        <TimelineEntry key={event.id || i} event={event} isLast={i === shown.length - 1 && !showAll} />
      ))}

      {secondary.length > 0 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="text-xs text-blue-600 hover:text-blue-800 mt-2 pl-6"
        >
          {showAll
            ? 'Show fewer events'
            : `Show ${secondary.length} more event${secondary.length !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}

function TimelineEntry({ event, isLast }) {
  const label = EVENT_LABELS[event.eventType] || event.eventType;
  const dateStr = formatDateTime(event.createdAt);
  const isMilestone = PRIMARY_EVENTS.has(event.eventType);

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
          isMilestone ? 'bg-green-500' : 'bg-gray-300'
        }`} />
        {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
      </div>

      {/* Content */}
      <div className="pb-4 min-w-0">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        {dateStr && (
          <div className="text-xs text-gray-400 mt-0.5">{dateStr}</div>
        )}
      </div>
    </div>
  );
}

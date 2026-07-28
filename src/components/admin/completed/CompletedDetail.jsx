import React, { useState, useEffect } from 'react';
import { getRepo } from '../../../utils/repository';
import CustomerSupportHeader from './CustomerSupportHeader';
import PaymentSummaryPanel from './PaymentSummaryPanel';
import CompletionPackagePanel from './CompletionPackagePanel';
import SupportTimeline from './SupportTimeline';
import SupportNotesPanel from './SupportNotesPanel';

export default function CompletedDetail({ bookingId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const repo = await getRepo();
      const data = await repo.getCompletionDetail(bookingId);
      setDetail(data);
    } catch (e) {
      setError(e.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [bookingId]);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-4">
        <BackButton onBack={onBack} />
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
        <button onClick={load} className="text-sm text-blue-600 hover:text-blue-800">
          Retry
        </button>
      </div>
    );
  }

  if (!detail) return null;

  const { booking, completion, photos, timeline, supportNotes } = detail;

  return (
    <div className="space-y-6 pb-12">
      <BackButton onBack={onBack} label={`Back · ${booking.bookingRef}`} />

      {/* ── Customer support header ── */}
      <Section>
        <CustomerSupportHeader booking={booking} />
      </Section>

      {/* ── Payment summary ── */}
      {booking.stripeInvoiceId && (
        <Section title="Payment Summary">
          <PaymentSummaryPanel
            bookingId={bookingId}
            stripeInvoiceId={booking.stripeInvoiceId}
          />
        </Section>
      )}

      {/* ── Completion package ── */}
      <Section title="Completion Package">
        <CompletionPackagePanel
          completion={completion}
          photos={photos}
          bookingId={bookingId}
        />
      </Section>

      {/* ── Timeline ── */}
      <Section title="Customer Support Timeline">
        <SupportTimeline events={timeline} />
      </Section>

      {/* ── Support notes (internal) ── */}
      <Section title="Customer Support Notes">
        <SupportNotesPanel bookingId={bookingId} initialNotes={supportNotes} />
      </Section>

      {/* ── Secondary / collapsed sections ── */}
      {booking.internalEstimate && (
        <CollapsedSection title="Pricing Analysis">
          <pre className="text-xs text-gray-600 overflow-auto bg-gray-50 rounded p-3 max-h-64">
            {JSON.stringify(booking.internalEstimate, null, 2)}
          </pre>
        </CollapsedSection>
      )}

      {booking.actuals && (
        <CollapsedSection title="Estimated vs Actual">
          <ActualsSection actuals={booking.actuals} estimate={booking.internalEstimate} />
        </CollapsedSection>
      )}

      {timeline.length > 0 && (
        <CollapsedSection title="Full Audit Log">
          <AuditTable events={timeline} />
        </CollapsedSection>
      )}
    </div>
  );
}

function BackButton({ onBack, label = 'Back to results' }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      {title && <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">{title}</h3>}
      {children}
    </div>
  );
}

function CollapsedSection({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {title}
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

function ActualsSection({ actuals, estimate }) {
  if (!actuals) return <div className="text-sm text-gray-400">No actuals recorded.</div>;
  return (
    <div className="space-y-1 text-sm">
      {Object.entries(actuals).map(([key, val]) => (
        val != null ? (
          <div key={key} className="flex justify-between">
            <span className="text-gray-500">{key}</span>
            <span className="font-medium text-gray-800">{String(val)}</span>
          </div>
        ) : null
      ))}
    </div>
  );
}

function AuditTable({ events }) {
  return (
    <div className="space-y-2 text-xs">
      {events.map((e, i) => (
        <div key={e.id || i} className="flex gap-3 text-gray-600">
          <span className="text-gray-400 flex-shrink-0 w-36">
            {e.createdAt ? new Date(e.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
          </span>
          <span className="font-mono">{e.eventType}</span>
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border p-4 space-y-3">
          <div className="h-5 bg-gray-100 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-2/3" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

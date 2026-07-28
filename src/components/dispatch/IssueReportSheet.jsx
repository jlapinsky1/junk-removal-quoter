import React, { useState } from 'react';
import { getRepo } from '../../utils/repository';

const ISSUE_TYPES = [
  { value: 'customer_unavailable',    label: 'Customer Unavailable' },
  { value: 'cannot_access_property',  label: 'Cannot Access Property' },
  { value: 'scope_differs',           label: 'Scope Differs from Quote' },
  { value: 'prohibited_material',     label: 'Prohibited / Hazardous Material' },
  { value: 'customer_canceled',       label: 'Customer Canceled' },
  { value: 'equipment_issue',         label: 'Equipment Issue' },
  { value: 'other',                   label: 'Other' },
];

/**
 * @param {object} props
 * @param {string} props.bookingId
 * @param {function} props.onClose
 * @param {function} [props.onSuccess]
 */
export default function IssueReportSheet({ bookingId, onClose, onSuccess }) {
  const [issueType, setIssueType] = useState('');
  const [notes, setNotes]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);

  const isScopeDiffers = issueType === 'scope_differs';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!issueType)      return setError('Please select an issue type');
    if (!notes.trim())   return setError('Notes are required');

    setSubmitting(true);
    setError(null);
    try {
      const repo = await getRepo();
      await repo.reportDispatchIssue({ bookingId, issueType, notes: notes.trim() });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save issue report. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Report an Issue</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issue Type <span className="text-red-500">*</span>
            </label>
            <select
              value={issueType}
              onChange={e => { setIssueType(e.target.value); setError(null); }}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="">Select an issue…</option>
              {ISSUE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {isScopeDiffers && (
            <div className="rounded-xl bg-red-50 border border-red-300 p-4">
              <p className="text-red-800 text-sm font-semibold">
                Stop work and contact the office.
              </p>
              <p className="text-red-700 text-sm mt-1">
                Do not remove items outside the approved scope.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setError(null); }}
              placeholder="Describe what happened…"
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-4 rounded-xl border border-gray-300 text-gray-700 font-semibold text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-base transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Report Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

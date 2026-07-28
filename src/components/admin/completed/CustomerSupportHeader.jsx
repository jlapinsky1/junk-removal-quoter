import React, { useState } from 'react';
import { getRepo } from '../../../utils/repository';

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CustomerSupportHeader({ booking }) {
  const {
    id: bookingId,
    bookingRef,
    customerName,
    customerPhone,
    customerEmail,
    fullAddress,
    completedAt,
    financiallyCompletedAt,
    stripeInvoiceId,
    stripeFinalPaymentIntentId,
  } = booking;

  const isPaid = financiallyCompletedAt != null;
  const completionDate = formatDate(completedAt);

  return (
    <div className="space-y-4">
      {/* Identity row */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-gray-900">
          {customerName || 'Customer name unavailable'}
        </h2>
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
          {bookingRef}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {isPaid ? 'Paid' : 'Balance Due'}
        </span>
      </div>

      {/* Contact + location details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
        {customerPhone && (
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-gray-400">Phone</span>
            <a href={`tel:${customerPhone}`} className="hover:text-blue-600 font-medium">
              {customerPhone}
            </a>
          </div>
        )}
        {customerEmail && (
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-gray-400">Email</span>
            <a href={`mailto:${customerEmail}`} className="hover:text-blue-600 font-medium truncate">
              {customerEmail}
            </a>
          </div>
        )}
        {fullAddress && (
          <div className="flex items-start gap-2 text-gray-600 sm:col-span-2">
            <span className="text-gray-400 flex-shrink-0">Address</span>
            <span className="font-medium">{fullAddress}</span>
          </div>
        )}
        {completionDate && (
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-gray-400">Completed</span>
            <span className="font-medium">{completionDate}</span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <QuickActions
        bookingId={bookingId}
        customerPhone={customerPhone}
        customerEmail={customerEmail}
        stripeInvoiceId={stripeInvoiceId}
        hasFinalPayment={!!stripeFinalPaymentIntentId}
        isPaid={isPaid}
      />
    </div>
  );
}

function QuickActions({ bookingId, customerPhone, customerEmail, stripeInvoiceId, hasFinalPayment, isPaid }) {
  const [toast, setToast] = useState(null);
  const [resending, setResending] = useState(false);
  const [copying, setCopying] = useState(false);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleCopyCustomerLink() {
    if (!hasFinalPayment) {
      showToast('No final payment has been requested yet.', 'error');
      return;
    }
    setCopying(true);
    try {
      const repo = await getRepo();
      const result = await repo.adminPaymentAction(bookingId, 'generate_customer_link');
      await navigator.clipboard.writeText(result.customerUrl);
      showToast('Customer link copied to clipboard');
    } catch (e) {
      showToast(e.message || 'Failed to generate link', 'error');
    } finally {
      setCopying(false);
    }
  }

  async function handleResendCustomerLink() {
    if (!hasFinalPayment) {
      showToast('No final payment has been requested yet.', 'error');
      return;
    }
    if (isPaid) {
      showToast('Final payment is already complete.', 'error');
      return;
    }
    setResending(true);
    try {
      const repo = await getRepo();
      await repo.adminPaymentAction(bookingId, 'resend_final_link');
      showToast('Customer link resent via email');
    } catch (e) {
      showToast(e.message || 'Failed to resend', 'error');
    } finally {
      setResending(false);
    }
  }

  function handleCopyRef() {
    const ref = `RES-${bookingId.slice(0, 8).toUpperCase()}`;
    navigator.clipboard.writeText(ref).then(() => {
      showToast(`${ref} copied`);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {customerPhone && (
          <a href={`tel:${customerPhone}`} className="inline-flex items-center text-xs font-medium bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Call Customer
          </a>
        )}
        {customerEmail && (
          <a href={`mailto:${customerEmail}`} className="inline-flex items-center text-xs font-medium bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Email Customer
          </a>
        )}
        <button onClick={handleCopyRef} className="inline-flex items-center text-xs font-medium bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
          Copy Booking Ref
        </button>
        <button
          onClick={handleCopyCustomerLink}
          disabled={copying}
          className="inline-flex items-center text-xs font-medium bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
        >
          {copying ? 'Generating…' : 'Copy Customer Link'}
        </button>
        <button
          onClick={handleResendCustomerLink}
          disabled={resending || isPaid}
          className="inline-flex items-center text-xs font-medium bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
        >
          {resending ? 'Resending…' : 'Resend Customer Link'}
        </button>
        {stripeInvoiceId && (
          <a
            href={`https://dashboard.stripe.com/invoices/${stripeInvoiceId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-xs font-medium bg-gray-50 text-gray-500 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            Stripe Dashboard
          </a>
        )}
        <a
          href={`/api/residential-completion-pdf?bookingId=${encodeURIComponent(bookingId)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center text-xs font-medium bg-gray-50 text-gray-500 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          Download Report
        </a>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`text-xs px-3 py-2 rounded-lg w-fit ${
          toast.type === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

import React, { useRef } from 'react';

const COMPANY_NAME = 'Junk Pickup';

export default function CustomerQuoteView({ formData, quoteResult, onClose }) {
  const quoteRef = useRef(null);

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7);
  const validDateStr = validUntil.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Build a scope description from load size + notes
  const scopeText = formData.notes
    ? `Remove approximately one ${formData.loadSize.toLowerCase()} consisting of ${formData.notes.toLowerCase().replace(/\.$/, '')}.`
    : `Remove approximately one ${formData.loadSize.toLowerCase()} of items as described.`;

  function handleCopy() {
    const text = [
      'Junk Removal Estimate',
      '',
      `Prepared for:`,
      formData.customerName,
      formData.jobAddress,
      '',
      `Estimated Price: $${quoteResult.suggestedQuote}`,
      '',
      'Includes:',
      '  - Loading',
      '  - Hauling',
      '  - Responsible disposal',
      '  - Cleanup of pickup area',
      '',
      'Scope of Work:',
      scopeText,
      '',
      'This estimate is based on the photos and description provided.',
      'If the actual load size or materials differ substantially when we arrive, we will discuss any pricing adjustment before beginning work.',
      '',
      `Estimate valid through ${validDateStr}.`,
      '',
      `Thank you for considering ${COMPANY_NAME}.`,
      "We'll contact you shortly after reviewing your request.",
    ].join('\n');

    navigator.clipboard.writeText(text);
    alert('Quote copied to clipboard!');
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Printable quote body */}
        <div ref={quoteRef} className="px-8 py-10">

          {/* Header bar */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{COMPANY_NAME}</h1>
              <p className="text-xs text-gray-400 tracking-widest uppercase mt-0.5">We Haul It All</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-gray-900 mb-6">Junk Removal Estimate</h2>

          {/* Prepared for */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Prepared for</p>
            <p className="text-base font-semibold text-gray-900">{formData.customerName}</p>
            <p className="text-sm text-gray-600">{formData.jobAddress}</p>
          </div>

          {/* Price card */}
          <div className="bg-gray-900 rounded-xl px-6 py-5 mb-6 text-center">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Estimated Price</p>
            <p className="text-4xl font-extrabold text-white">${quoteResult.suggestedQuote}</p>
          </div>

          {/* Includes */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Includes</p>
            <div className="space-y-2">
              {['Loading', 'Hauling', 'Responsible disposal', 'Cleanup of pickup area'].map(item => (
                <div key={item} className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <hr className="border-gray-200 mb-6" />

          {/* Scope of Work */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Scope of Work</p>
            <p className="text-sm text-gray-700 leading-relaxed">{scopeText}</p>
          </div>

          {/* Estimate Details */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Estimate Details</p>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              This estimate is based on the photos and description provided.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              If the actual load size or materials differ substantially when we arrive, we will discuss any pricing adjustment before beginning work.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Estimate valid through <span className="font-medium text-gray-800">{validDateStr}</span>.
            </p>
          </div>

          {/* Divider */}
          <hr className="border-gray-200 mb-6" />

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-700">
              Thank you for considering <span className="font-semibold text-gray-900">{COMPANY_NAME}</span>.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              We'll contact you shortly after reviewing your request.
            </p>
          </div>
        </div>

        {/* Action buttons (hidden when printing) */}
        <div className="no-print border-t px-6 py-4 flex gap-2 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleCopy}
            className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors"
          >
            Copy Quote
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors"
          >
            Print / PDF
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

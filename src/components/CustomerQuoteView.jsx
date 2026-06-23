import React, { useRef } from 'react';

export default function CustomerQuoteView({ formData, quoteResult, onClose }) {
  const quoteRef = useRef(null);

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7);

  function handleCopy() {
    const text = [
      'Junk Removal Quote',
      '',
      `Customer: ${formData.customerName}`,
      `Job Address: ${formData.jobAddress}`,
      `Scope: ${formData.loadSize}`,
      formData.notes ? `Notes: ${formData.notes}` : '',
      '',
      `Total Price: $${quoteResult.suggestedQuote}`,
      '',
      `Valid until: ${validUntil.toLocaleDateString()}`,
      '',
      'Notes:',
      '- Final price may change if load size/materials differ from photos or description.',
      '- Hazardous materials not included.',
      '- Price includes loading, hauling, disposal, and cleanup of the work area.',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    alert('Quote copied to clipboard!');
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div ref={quoteRef} className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-center text-gray-800 border-b pb-3">
            Junk Removal Quote
          </h2>

          <div className="space-y-2 text-sm">
            <div><span className="font-medium text-gray-500">Customer:</span> {formData.customerName}</div>
            <div><span className="font-medium text-gray-500">Job Address:</span> {formData.jobAddress}</div>
            <div><span className="font-medium text-gray-500">Scope:</span> {formData.loadSize}</div>
            {formData.addOns?.length > 0 && (
              <div>
                <span className="font-medium text-gray-500">Included services:</span>{' '}
                {formData.addOns.join(', ')}
              </div>
            )}
            {formData.notes && (
              <div><span className="font-medium text-gray-500">Notes:</span> {formData.notes}</div>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-500">Total Price</div>
            <div className="text-3xl font-bold text-gray-900">${quoteResult.suggestedQuote}</div>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>Valid until: {validUntil.toLocaleDateString()}</p>
            <p>- Final price may change if load size/materials differ from photos or description.</p>
            <p>- Hazardous materials not included.</p>
            <p>- Price includes loading, hauling, disposal, and cleanup of the work area.</p>
          </div>
        </div>

        <div className="no-print border-t p-4 flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium text-sm"
          >
            Copy Quote
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-medium text-sm"
          >
            Print Quote
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

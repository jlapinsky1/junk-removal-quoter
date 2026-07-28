import React, { useState } from 'react';
import { copyToClipboard } from '../../utils/clipboard';

export default function CustomerContactCard({ job }) {
  const [copied, setCopied] = useState(false);

  if (!job) return null;

  const { fullAddress, customerPhone } = job;
  const phone = customerPhone?.replace(/\D/g, '');

  async function handleCopyAddress() {
    if (!fullAddress) return;
    try {
      await copyToClipboard(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // If all clipboard methods fail, still show feedback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Customer &amp; Location</h2>

      {/* Address */}
      <div>
        <p className="text-xl font-bold text-gray-900 leading-snug">
          {fullAddress ?? 'No address on file'}
        </p>
        <button
          onClick={handleCopyAddress}
          disabled={!fullAddress}
          className={`mt-3 w-full py-3 rounded-xl text-base font-semibold transition-colors ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
          }`}
        >
          {copied ? 'Address copied!' : 'Copy Address'}
        </button>
      </div>

      {/* Call / Text */}
      <div className="flex gap-3">
        {phone ? (
          <>
            <a
              href={`tel:+1${phone}`}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-center font-semibold text-base hover:bg-blue-500 transition-colors"
            >
              Call Customer
            </a>
            <a
              href={`sms:+1${phone}`}
              className="flex-1 py-3 rounded-xl bg-gray-700 text-white text-center font-semibold text-base hover:bg-gray-600 transition-colors"
            >
              Text Customer
            </a>
          </>
        ) : (
          <p className="text-sm text-gray-400">No phone number on file</p>
        )}
      </div>
    </div>
  );
}

import React from 'react';

const COMPANY_NAME = 'Junk Pickup';

function buildQuoteHtml({ customerName, jobAddress, price, scopeText, validDateStr }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Estimate - ${customerName}</title>
<style>
  @page { margin: 0.6in; size: letter; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
  .brand { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
  .tagline { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 3px; margin-top: 2px; }
  .badge { width: 40px; height: 40px; background: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .badge svg { width: 20px; height: 20px; }
  h2 { font-size: 18px; font-weight: 700; margin-bottom: 24px; }
  .label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; margin-bottom: 4px; }
  .section { margin-bottom: 24px; }
  .customer-name { font-size: 16px; font-weight: 600; }
  .customer-addr { font-size: 14px; color: #4b5563; }
  .price-card { background: #111827; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .price-label { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; margin-bottom: 4px; }
  .price { font-size: 36px; font-weight: 800; color: white; }
  .check-item { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 14px; color: #374151; }
  .check-icon { color: #16a34a; font-size: 16px; font-weight: bold; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  .body-text { font-size: 13px; color: #4b5563; line-height: 1.6; margin-bottom: 8px; }
  .bold { font-weight: 600; color: #1a1a1a; }
  .footer { text-align: center; font-size: 13px; color: #374151; }
  .footer-sub { color: #6b7280; margin-top: 4px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${COMPANY_NAME}</div>
      <div class="tagline">We Haul It All</div>
    </div>
    <div class="badge">
      <svg fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
      </svg>
    </div>
  </div>

  <h2>Junk Removal Estimate</h2>

  <div class="section">
    <div class="label">Prepared For</div>
    <div class="customer-name">${customerName}</div>
    <div class="customer-addr">${jobAddress}</div>
  </div>

  <div class="price-card">
    <div class="price-label">Estimated Price</div>
    <div class="price">$${price}</div>
  </div>

  <div class="section">
    <div class="label">Includes</div>
    <div class="check-item"><span class="check-icon">&#10003;</span> Loading</div>
    <div class="check-item"><span class="check-icon">&#10003;</span> Hauling</div>
    <div class="check-item"><span class="check-icon">&#10003;</span> Responsible disposal</div>
    <div class="check-item"><span class="check-icon">&#10003;</span> Cleanup of pickup area</div>
  </div>

  <hr>

  <div class="section">
    <div class="label">Scope of Work</div>
    <div class="body-text">${scopeText}</div>
  </div>

  <div class="section">
    <div class="label">Estimate Details</div>
    <div class="body-text">This estimate is based on the photos and description provided.</div>
    <div class="body-text">If the actual load size or materials differ substantially when we arrive, we will discuss any pricing adjustment before beginning work.</div>
    <div class="body-text">Estimate valid through <span class="bold">${validDateStr}</span>.</div>
  </div>

  <hr>

  <div class="footer">
    Thanks for considering <span class="bold">${COMPANY_NAME}</span>.
    <div class="footer-sub">Our team has reviewed your request and we are excited to complete your pickup.</div>
  </div>
</body>
</html>`;
}

export default function CustomerQuoteView({ formData, quoteResult, onClose }) {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7);
  const validDateStr = validUntil.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const scopeText = formData.notes
    ? `Remove approximately one ${formData.loadSize.toLowerCase()} consisting of ${formData.notes.toLowerCase().replace(/\.$/, '')}.`
    : `Remove approximately one ${formData.loadSize.toLowerCase()} of items as described.`;

  function handleCopy() {
    const text = [
      'Junk Removal Estimate',
      '',
      'Prepared for:',
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
      `Thanks for considering ${COMPANY_NAME}.`,
      'Our team has reviewed your request and we are excited to complete your pickup.',
    ].join('\n');

    navigator.clipboard.writeText(text);
    alert('Quote copied to clipboard!');
  }

  function handlePrint() {
    const html = buildQuoteHtml({
      customerName: formData.customerName,
      jobAddress: formData.jobAddress,
      price: quoteResult.suggestedQuote,
      scopeText,
      validDateStr,
    });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">

        <div className="px-8 py-10">
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

          <h2 className="text-lg font-bold text-gray-900 mb-6">Junk Removal Estimate</h2>

          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Prepared for</p>
            <p className="text-base font-semibold text-gray-900">{formData.customerName}</p>
            <p className="text-sm text-gray-600">{formData.jobAddress}</p>
          </div>

          <div className="bg-gray-900 rounded-xl px-6 py-5 mb-6 text-center">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Estimated Price</p>
            <p className="text-4xl font-extrabold text-white">${quoteResult.suggestedQuote}</p>
          </div>

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

          <hr className="border-gray-200 mb-6" />

          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Scope of Work</p>
            <p className="text-sm text-gray-700 leading-relaxed">{scopeText}</p>
          </div>

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

          <hr className="border-gray-200 mb-6" />

          <div className="text-center">
            <p className="text-sm text-gray-700">
              Thanks for considering <span className="font-semibold text-gray-900">{COMPANY_NAME}</span>.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Our team has reviewed your request and we are excited to complete your pickup.
            </p>
          </div>
        </div>

        <div className="border-t px-6 py-4 flex gap-2 bg-gray-50 rounded-b-xl">
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

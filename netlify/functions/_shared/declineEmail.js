/**
 * Shared decline notification email for residential and commercial requests.
 */

const DEFAULT_MESSAGE = `Thank you for your request. Unfortunately, we do not have crew availability to take on your job at this time. We pride ourselves on being a locally owned and operated business with a small team, and we want to make sure every job we accept gets our full attention.

We appreciate your consideration and hope to serve you again in the future.`;

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildDeclineEmailHtml({ firstName, contextLine, brand = 'residential', customMessage }) {
  const subtitle = brand === 'commercial' ? 'Commercial Services' : 'We Haul It All';
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi there,';
  const body = escapeHtml(customMessage || DEFAULT_MESSAGE).replace(/\n/g, '<br>');

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0a0f0d;color:#fff;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:20px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;">SQUATTERZ</span>
        <div style="color:#22c55e;font-size:10px;letter-spacing:0.2em;font-weight:600;text-transform:uppercase;margin-top:4px;">${subtitle}</div>
      </div>
      <h1 style="font-size:20px;font-weight:900;margin:0 0 16px;text-align:center;">Update on your request</h1>
      <p style="color:rgba(255,255,255,0.75);font-size:14px;line-height:1.6;margin:0 0 12px;">${greeting}</p>
      ${contextLine ? `<p style="color:rgba(255,255,255,0.55);font-size:13px;line-height:1.5;margin:0 0 16px;">Regarding: <strong style="color:#fff;">${escapeHtml(contextLine)}</strong></p>` : ''}
      <p style="color:rgba(255,255,255,0.65);font-size:14px;line-height:1.7;margin:0 0 24px;">${body}</p>
      <p style="color:rgba(255,255,255,0.45);font-size:13px;line-height:1.6;margin:0;text-align:center;">
        Questions? Call us at <a href="tel:+17706282877" style="color:#22c55e;text-decoration:none;">(770) 628-2877</a>.
      </p>
    </div>
  `;
}

export async function sendDeclineEmail({
  to,
  firstName,
  contextLine,
  brand = 'residential',
  customMessage,
  subject,
}) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@squatterz.com';
  if (!resendKey || !to) {
    return { sent: false, reason: !resendKey ? 'RESEND_API_KEY not configured' : 'No recipient email' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Squatterz <${fromEmail}>`,
      to: [to],
      subject: subject || 'Update on your Squatterz request',
      html: buildDeclineEmailHtml({ firstName, contextLine, brand, customMessage }),
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error('Decline email send failed:', res.status, err);
    return { sent: false, reason: `Email API error (${res.status})` };
  }

  return { sent: true };
}

export { DEFAULT_MESSAGE };

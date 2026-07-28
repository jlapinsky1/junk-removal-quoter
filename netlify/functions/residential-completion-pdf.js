import {
  getServiceClient, verifyAdmin, sha256, errorResponse,
} from './_shared/supabase.js';
import PDFDocument from 'pdfkit';

export default async function handler(req) {
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405);

  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  const bookingId = url.searchParams.get('bookingId');

  if (!token && !bookingId) {
    return errorResponse('token or bookingId is required');
  }

  const supabase = getServiceClient();
  let resolvedBookingId;

  // ── Auth: payment access token (customer) or admin Bearer ──────────────────
  if (bookingId) {
    const admin = await verifyAdmin(req);
    if (!admin) return errorResponse('Unauthorized', 401);
    resolvedBookingId = bookingId;
  } else {
    const tokenHash = await sha256(token);

    const { data: tokenRow, error: tokenErr } = await supabase
      .from('payment_access_tokens')
      .select('booking_id, expires_at, revoked_at, purpose')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (
      tokenErr ||
      !tokenRow ||
      tokenRow.revoked_at ||
      tokenRow.purpose !== 'final_payment' ||
      new Date(tokenRow.expires_at) < new Date()
    ) {
      return errorResponse('This link is invalid or has expired', 400);
    }

    resolvedBookingId = tokenRow.booking_id;
  }

  // ── Load booking ───────────────────────────────────────────────────────────
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('id, full_address, approved_quote, customer_name')
    .eq('id', resolvedBookingId)
    .single();

  if (bookingErr || !booking) return errorResponse('Booking not found', 404);

  // ── Load completion record ─────────────────────────────────────────────────
  const { data: completion, error: completionErr } = await supabase
    .from('booking_completions')
    .select(
      'completed_at, technician_name, items_removed, volume_estimate, ' +
      'completion_notes, disposal_notes, final_amount_cents'
    )
    .eq('booking_id', resolvedBookingId)
    .maybeSingle();

  if (completionErr || !completion) {
    return errorResponse('Completion data not found', 404);
  }

  // ── PDF generation ─────────────────────────────────────────────────────────
  const chunks = [];
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  doc.on('data', c => chunks.push(c));

  const green = '#16a34a';
  const gray  = '#6b7280';
  const dark  = '#111827';

  const pw   = doc.page.width - 100;
  const col1 = 50;
  const col2 = 50 + pw / 2;

  const bookingRef = `RES-${resolvedBookingId.slice(0, 8).toUpperCase()}`;

  // ── Header ────────────────────────────────────────────────────────────────
  doc.fontSize(20).fillColor(dark).font('Helvetica-Bold')
    .text('Completion Report', col1, 50);
  doc.fontSize(10).fillColor(gray).font('Helvetica')
    .text(`Squatterz LLC  |  Reference #${bookingRef}`, col1, 76);

  doc.moveTo(col1, 96).lineTo(col1 + pw, 96).lineWidth(1).strokeColor('#e5e7eb').stroke();

  // ── Details grid ──────────────────────────────────────────────────────────
  let y = 110;

  function fieldLabel(text, x, yPos) {
    doc.fontSize(8).fillColor(gray).font('Helvetica-Bold')
      .text(text.toUpperCase(), x, yPos);
  }
  function fieldValue(text, x, yPos) {
    doc.fontSize(11).fillColor(dark).font('Helvetica')
      .text(text || '-', x, yPos + 13, { width: pw / 2 - 15, lineBreak: false });
  }

  fieldLabel('Service Address', col1, y);
  fieldValue(booking.full_address || '-', col1, y);

  const completedStr = completion.completed_at
    ? new Date(completion.completed_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : '-';
  fieldLabel('Completion Date', col2, y);
  fieldValue(completedStr, col2, y);

  y += 44;
  fieldLabel('Crew / Technician', col1, y);
  fieldValue(completion.technician_name || '-', col1, y);

  fieldLabel('Booking Reference', col2, y);
  fieldValue(bookingRef, col2, y);

  y += 50;
  doc.moveTo(col1, y).lineTo(col1 + pw, y).lineWidth(1).strokeColor('#e5e7eb').stroke();
  y += 16;

  // ── Work summary ──────────────────────────────────────────────────────────
  const workParts = [];
  if (completion.items_removed)   workParts.push({ label: 'Items Removed',      value: completion.items_removed });
  if (completion.volume_estimate) workParts.push({ label: 'Volume / Load Size', value: completion.volume_estimate });
  if (completion.completion_notes) workParts.push({ label: 'Completion Notes',  value: completion.completion_notes });
  if (completion.disposal_notes)  workParts.push({ label: 'Disposal / Donation', value: completion.disposal_notes });

  if (workParts.length > 0) {
    doc.fontSize(11).fillColor(dark).font('Helvetica-Bold').text('Work Summary', col1, y);
    y += 18;

    workParts.forEach(part => {
      doc.fontSize(8).fillColor(gray).font('Helvetica-Bold').text(part.label.toUpperCase(), col1, y);
      y += 13;
      doc.fontSize(11).fillColor(dark).font('Helvetica').text(part.value, col1, y, { width: pw });
      y += doc.heightOfString(part.value, { width: pw }) + 10;
    });

    y += 6;
    doc.moveTo(col1, y).lineTo(col1 + pw, y).lineWidth(1).strokeColor('#e5e7eb').stroke();
    y += 16;
  }

  // ── Invoice summary ───────────────────────────────────────────────────────
  const approvedCents  = Math.round(Number(booking.approved_quote) * 100);
  const depositCents   = Math.floor(approvedCents / 2);
  const finalCents     = completion.final_amount_cents;
  const remainingCents = Math.max(0, finalCents - depositCents);
  const fmt = cents => `$${(cents / 100).toFixed(2)}`;

  doc.fontSize(11).fillColor(dark).font('Helvetica-Bold').text('Invoice Summary', col1, y);
  y += 18;

  const invoiceRows = [];
  if (finalCents !== approvedCents) {
    invoiceRows.push({ label: 'Final Job Total', value: fmt(finalCents), bold: true });
  }
  invoiceRows.push(
    { label: 'Approved Quote', value: fmt(approvedCents) },
    { label: 'Deposit Paid',   value: fmt(depositCents) },
    {
      label: remainingCents > 0 ? 'Balance Remaining' : 'Balance Paid',
      value: fmt(remainingCents > 0 ? remainingCents : depositCents),
      bold: remainingCents > 0,
    },
  );

  invoiceRows.forEach(row => {
    const color = row.bold ? green : dark;
    doc.fontSize(11).fillColor(color).font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
      .text(row.label, col1, y);
    doc.fontSize(11).fillColor(color).font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
      .text(row.value, col1, y, { width: pw, align: 'right' });
    y += 20;
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  y += 20;
  doc.moveTo(col1, y).lineTo(col1 + pw, y).lineWidth(1).strokeColor('#e5e7eb').stroke();
  y += 10;
  const genDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  doc.fontSize(8).fillColor(gray).font('Helvetica')
    .text(`Squatterz LLC  |  Generated ${genDate}`, col1, y, { width: pw, align: 'center' });

  doc.end();

  const pdfBuffer = await new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Squatterz-${bookingRef}.pdf"`,
    },
  });
}

export const config = { path: '/api/residential-completion-pdf' };

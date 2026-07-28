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

  // ── Load photos (up to 2 before, up to 2 after for PDF) ───────────────────
  const { data: photos } = await supabase
    .from('booking_photos')
    .select('storage_path, kind, sort_order')
    .eq('booking_id', resolvedBookingId)
    .in('kind', ['before', 'after'])
    .order('kind', { ascending: true })
    .order('sort_order', { ascending: true });

  const beforePhotos = (photos ?? []).filter(p => p.kind === 'before').slice(0, 2);
  const afterPhotos  = (photos ?? []).filter(p => p.kind === 'after').slice(0, 2);

  // ── Fetch images via signed URLs → buffers (never use raw storage paths) ──
  async function fetchImageBuffer(storagePath) {
    try {
      const { data, error } = await supabase.storage
        .from('booking-photos')
        .createSignedUrl(storagePath, 300); // 5-minute expiry for PDF generation

      if (error || !data?.signedUrl) return null;
      const res = await fetch(data.signedUrl);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return Buffer.from(buf);
    } catch {
      return null;
    }
  }

  const [beforeImages, afterImages] = await Promise.all([
    Promise.all(beforePhotos.map(p => fetchImageBuffer(p.storage_path))),
    Promise.all(afterPhotos.map(p => fetchImageBuffer(p.storage_path))),
  ]);

  // ── PDF generation ─────────────────────────────────────────────────────────
  const chunks = [];
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  doc.on('data', c => chunks.push(c));

  const green   = '#22c55e';
  const dark    = '#0a0f0d';
  const cardBg  = '#141a16';
  const mutedText = '#8a9a8f';
  const white   = '#ffffff';
  const bodyText = '#c8d8cc';

  const pw = doc.page.width - 100; // page width minus margins (50 each side)
  const col1 = 50;
  const col2 = 50 + pw / 2;

  // ── Background ─────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(dark);

  // ── Header card ───────────────────────────────────────────────────────────
  const headerY = 50;
  doc.roundedRect(col1, headerY, pw, 70, 8).fill(cardBg);

  // Green icon square
  doc.roundedRect(65, headerY + 15, 40, 40, 8).fill('#1a3a24');
  doc.fontSize(18).fillColor(green).text('✓', 75, headerY + 25, { width: 20, align: 'center' });

  // Title + reference
  const bookingRef = `RES-${resolvedBookingId.slice(0, 8).toUpperCase()}`;
  doc.fontSize(16).fillColor(white).font('Helvetica-Bold')
    .text('Completion Report', 115, headerY + 18);
  doc.fontSize(9).fillColor(mutedText).font('Helvetica')
    .text(`Reference #${bookingRef}`, 115, headerY + 38);

  // Completed badge
  doc.roundedRect(pw - 50, headerY + 20, 90, 26, 13).fill('#1a3a24');
  doc.fontSize(8).fillColor(green).font('Helvetica-Bold')
    .text('COMPLETED', pw - 45, headerY + 28, { width: 80, align: 'center' });

  // ── Details grid ──────────────────────────────────────────────────────────
  let y = headerY + 90;

  function label(text, x, yPos) {
    doc.fontSize(8).fillColor(mutedText).font('Helvetica-Bold')
      .text(text.toUpperCase(), x, yPos);
  }

  function value(text, x, yPos) {
    doc.fontSize(12).fillColor(white).font('Helvetica-Bold')
      .text(text || '\u2014', x, yPos + 14);
  }

  label('Service Address', col1, y);
  value(booking.full_address || '\u2014', col1, y);

  label('Completion Date', col2, y);
  const completedStr = completion.completed_at
    ? new Date(completion.completed_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : '\u2014';
  value(completedStr, col2, y);

  y += 50;
  label('Crew / Technician', col1, y);
  value(completion.technician_name, col1, y);

  label('Booking Reference', col2, y);
  value(bookingRef, col2, y);

  y += 60;

  // ── Before & After photos ─────────────────────────────────────────────────
  const allImages = [
    ...beforeImages.filter(Boolean).map(img => ({ img, kind: 'Before' })),
    ...afterImages.filter(Boolean).map(img => ({ img, kind: 'After' })),
  ];

  if (allImages.length > 0) {
    label('Before & After Photos', col1, y);
    y += 18;

    const photoW = allImages.length === 1 ? pw : (pw - 10) / 2;
    const photoH = 160;

    allImages.forEach(({ img, kind }, i) => {
      const x = i % 2 === 0 ? col1 : col1 + photoW + 10;
      if (i === 2) y += photoH + 12; // start second row

      try {
        doc.roundedRect(x, y, photoW, photoH, 8).fill('#0d1410');
        doc.image(img, x + 2, y + 2, {
          width: photoW - 4,
          height: photoH - 4,
          fit: [photoW - 4, photoH - 4],
          align: 'center',
          valign: 'center',
        });

        // Kind label badge
        const lblBg    = kind === 'After' ? green : '#000000';
        const lblColor = kind === 'After' ? dark : white;
        doc.roundedRect(x + 8, y + 8, 42, 16, 3).fill(lblBg);
        doc.fontSize(7).fillColor(lblColor).font('Helvetica-Bold')
          .text(kind, x + 10, y + 12, { width: 38, align: 'center' });
      } catch {
        // Skip if image fails to render
      }
    });

    const photoRows = Math.ceil(allImages.length / 2);
    y += photoRows === 1 ? photoH + 20 : photoH + 32;
  }

  // ── Work summary card ─────────────────────────────────────────────────────
  const workParts = [];
  if (completion.items_removed) {
    workParts.push({ label: 'Items Removed', value: completion.items_removed });
  }
  if (completion.volume_estimate) {
    workParts.push({ label: 'Volume / Load Size', value: completion.volume_estimate });
  }
  if (completion.completion_notes) {
    workParts.push({ label: 'Completion Notes', value: completion.completion_notes });
  }
  if (completion.disposal_notes) {
    workParts.push({ label: 'Disposal / Donation', value: completion.disposal_notes });
  }

  if (workParts.length > 0) {
    // Measure card height
    let totalHeight = 20;
    workParts.forEach(part => {
      totalHeight += 16; // label
      totalHeight += doc.fontSize(11).font('Helvetica').heightOfString(part.value, { width: pw - 30 }) + 12;
    });
    totalHeight += 10;

    doc.roundedRect(col1, y, pw, totalHeight, 8)
      .lineWidth(1).strokeColor('#2a3a2e').fillAndStroke(cardBg, '#2a3a2e');

    let contentY = y + 15;
    workParts.forEach(part => {
      doc.fontSize(8).fillColor(mutedText).font('Helvetica-Bold')
        .text(part.label.toUpperCase(), col1 + 15, contentY);
      contentY += 16;
      doc.fontSize(11).fillColor(bodyText).font('Helvetica')
        .text(part.value, col1 + 15, contentY, { width: pw - 30 });
      contentY += doc.heightOfString(part.value, { width: pw - 30 }) + 12;
    });

    y = contentY + 20;
  }

  // ── Invoice summary card ──────────────────────────────────────────────────
  const approvedCents  = Math.round(Number(booking.approved_quote) * 100);
  const depositCents   = Math.floor(approvedCents / 2);
  const finalCents     = completion.final_amount_cents;
  const remainingCents = Math.max(0, finalCents - depositCents);

  const fmt = cents => `$${(cents / 100).toFixed(2)}`;

  const invoiceRows = [
    { label: 'Approved Quote', value: fmt(approvedCents) },
    { label: 'Deposit Paid',   value: fmt(depositCents) },
    {
      label: remainingCents > 0 ? 'Balance Remaining' : 'Balance Paid',
      value: fmt(remainingCents > 0 ? remainingCents : depositCents),
      highlight: remainingCents > 0,
    },
  ];
  if (finalCents !== approvedCents) {
    invoiceRows.unshift({ label: 'Final Job Total', value: fmt(finalCents), highlight: true });
  }

  const invoiceCardH = 20 + invoiceRows.length * 26 + 10;
  doc.roundedRect(col1, y, pw, invoiceCardH, 8)
    .lineWidth(1).strokeColor('#2a3a2e').fillAndStroke(cardBg, '#2a3a2e');

  doc.fontSize(8).fillColor(mutedText).font('Helvetica-Bold')
    .text('INVOICE SUMMARY', col1 + 15, y + 15);

  let rowY = y + 31;
  invoiceRows.forEach(row => {
    doc.fontSize(11).fillColor(row.highlight ? green : white).font('Helvetica-Bold')
      .text(row.label, col1 + 15, rowY);
    doc.fontSize(11).fillColor(row.highlight ? green : white).font('Helvetica-Bold')
      .text(row.value, col1, rowY, { width: pw - 15, align: 'right' });
    rowY += 26;
  });

  // ── Footer branding ───────────────────────────────────────────────────────
  const footerY = doc.page.height - 60;
  doc.fontSize(8).fillColor(mutedText).font('Helvetica')
    .text('Squatterz LLC · Gainesville, GA', col1, footerY, { width: pw, align: 'center' });
  doc.fontSize(7).fillColor('#4a5a4e').font('Helvetica')
    .text(
      `Generated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      col1, footerY + 14, { width: pw, align: 'center' }
    );

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

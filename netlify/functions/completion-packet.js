import { getServiceClient, errorResponse } from './_shared/supabase.js';
import PDFDocument from 'pdfkit';

export default async function handler(req) {
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405);

  const url = new URL(req.url, 'http://localhost');
  const jobId = url.searchParams.get('jobId');
  const token = req.headers.get('authorization')?.slice(7);

  if (!jobId) return errorResponse('jobId is required');
  if (!token) return errorResponse('Unauthorized', 401);

  const supabase = getServiceClient();

  // Verify the user is authenticated
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return errorResponse('Unauthorized', 401);

  // Fetch job with property
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('*, properties(*)')
    .eq('id', jobId)
    .maybeSingle();

  if (jobErr || !job) return errorResponse('Job not found', 404);
  if (job.status !== 'completed') return errorResponse('Completion packet is only available for completed jobs', 400);

  // Verify user owns this job via commercial_clients -> properties chain
  const { data: client } = await supabase
    .from('commercial_clients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!client) return errorResponse('Unauthorized', 401);

  const { data: propCheck } = await supabase
    .from('properties')
    .select('id')
    .eq('id', job.property_id)
    .eq('client_id', client.id)
    .maybeSingle();

  if (!propCheck) return errorResponse('Unauthorized', 401);

  // Fetch photos
  const { data: photos } = await supabase
    .from('job_photos')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  // Fetch related invoice
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle();

  // Download photo images as buffers
  const beforePhotos = (photos ?? []).filter(p => p.kind === 'before');
  const afterPhotos = (photos ?? []).filter(p => p.kind === 'after');

  async function fetchImage(storagePath) {
    try {
      const { data } = supabase.storage.from('job-photos').getPublicUrl(storagePath);
      const res = await fetch(data.publicUrl);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return Buffer.from(buf);
    } catch { return null; }
  }

  const beforeImages = await Promise.all(beforePhotos.slice(0, 2).map(p => fetchImage(p.storage_path)));
  const afterImages = await Promise.all(afterPhotos.slice(0, 2).map(p => fetchImage(p.storage_path)));

  // Generate PDF
  const chunks = [];
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  doc.on('data', c => chunks.push(c));

  const green = '#22c55e';
  const dark = '#0a0f0d';
  const cardBg = '#141a16';
  const mutedText = '#8a9a8f';
  const white = '#ffffff';

  const pw = doc.page.width - 100; // page width minus margins

  // Background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(dark);

  // Header card
  const headerY = 50;
  doc.roundedRect(50, headerY, pw, 70, 8).fill(cardBg);

  // Green icon square
  doc.roundedRect(65, headerY + 15, 40, 40, 8).fill('#1a3a24');
  doc.fontSize(18).fillColor(green).text('✓', 75, headerY + 25, { width: 20, align: 'center' });

  // Title
  doc.fontSize(16).fillColor(white).font('Helvetica-Bold')
    .text('Completion Packet', 115, headerY + 18);
  const workOrderNum = `WO-${jobId.slice(0, 8).toUpperCase()}`;
  doc.fontSize(9).fillColor(mutedText).font('Helvetica')
    .text(`Work Order #${workOrderNum}`, 115, headerY + 38);

  // Completed badge
  doc.roundedRect(pw - 50, headerY + 20, 90, 26, 13).fill('#1a3a24');
  doc.fontSize(8).fillColor(green).font('Helvetica-Bold')
    .text('COMPLETED', pw - 45, headerY + 28, { width: 80, align: 'center' });

  // Details grid
  let y = headerY + 90;
  const col1 = 50;
  const col2 = 50 + pw / 2;

  function label(text, x, yPos) {
    doc.fontSize(8).fillColor(mutedText).font('Helvetica-Bold').text(text.toUpperCase(), x, yPos);
  }
  function value(text, x, yPos) {
    doc.fontSize(12).fillColor(white).font('Helvetica-Bold').text(text || '\u2014', x, yPos + 14);
  }

  label('Property', col1, y);
  value(job.properties?.name || 'Unknown', col1, y);

  label('Unit', col2, y);
  value(job.unit || '\u2014', col2, y);

  y += 50;
  label('Completed', col1, y);
  const completedStr = job.completed_at
    ? new Date(job.completed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '\u2014';
  value(completedStr, col1, y);

  label('Estimate', col2, y);
  const estStr = job.estimate != null
    ? `$${Number(job.estimate).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : '\u2014';
  value(estStr, col2, y);

  y += 60;

  // Before & After photos section
  const allImages = [...beforeImages.filter(Boolean), ...afterImages.filter(Boolean)];
  if (allImages.length > 0) {
    label('Before & After', col1, y);
    y += 18;

    const photoW = allImages.length === 1 ? pw : (pw - 10) / 2;
    const photoH = 160;

    allImages.forEach((img, i) => {
      if (!img) return;
      const x = i === 0 ? col1 : col1 + photoW + 10;
      try {
        // Photo frame
        doc.roundedRect(x, y, photoW, photoH, 8).fill('#0d1410');
        doc.image(img, x + 2, y + 2, { width: photoW - 4, height: photoH - 4, fit: [photoW - 4, photoH - 4], align: 'center', valign: 'center' });

        // Label
        const photoLabel = i < beforeImages.filter(Boolean).length ? 'Before' : 'After';
        const lblBg = photoLabel === 'After' ? green : '#000000';
        const lblColor = photoLabel === 'After' ? dark : white;
        doc.roundedRect(x + 8, y + 8, 42, 16, 3).fill(lblBg);
        doc.fontSize(7).fillColor(lblColor).font('Helvetica-Bold')
          .text(photoLabel, x + 10, y + 12, { width: 38, align: 'center' });
      } catch {
        // Skip if image fails to render
      }
    });

    y += photoH + 20;
  }

  // Items removed / description card
  if (job.description || job.items_removed || job.completion_notes) {
    const cardStartY = y;
    // We'll draw the card background after measuring content height
    let contentY = y + 15;

    const textParts = [];

    if (job.items_removed || job.description) {
      textParts.push({ label: 'Items Removed', value: job.items_removed || job.description });
    }

    if (job.completion_notes) {
      textParts.push({ label: 'Issues Noticed', value: job.completion_notes });
    }

    // Measure height
    let totalHeight = 30;
    textParts.forEach(part => {
      totalHeight += 16; // label
      const textHeight = doc.fontSize(11).font('Helvetica').heightOfString(part.value, { width: pw - 30 });
      totalHeight += textHeight + 15;
    });

    // Draw card background
    doc.roundedRect(col1, cardStartY, pw, totalHeight, 8).lineWidth(1).strokeColor('#2a3a2e').fillAndStroke(cardBg, '#2a3a2e');

    contentY = cardStartY + 15;
    textParts.forEach(part => {
      doc.fontSize(8).fillColor(mutedText).font('Helvetica-Bold')
        .text(part.label.toUpperCase(), col1 + 15, contentY);
      contentY += 16;
      doc.fontSize(11).fillColor('#c8d8cc').font('Helvetica')
        .text(part.value, col1 + 15, contentY, { width: pw - 30 });
      contentY += doc.heightOfString(part.value, { width: pw - 30 }) + 15;
    });

    y = contentY + 10;
  }

  // Invoice footer
  if (invoice || job.final_amount != null) {
    y += 5;
    if (invoice) {
      doc.fontSize(9).fillColor(mutedText).font('Helvetica')
        .text(`Invoice ${invoice.invoice_number} · ${invoice.amount != null ? '$' + Number(invoice.amount).toFixed(2) : ''}`, col1, y);
    }
    if (job.final_amount != null) {
      doc.fontSize(9).fillColor(mutedText).font('Helvetica')
        .text(`Final amount: $${Number(job.final_amount).toFixed(2)}`, col2, y);
    }
  }

  // Footer branding
  const footerY = doc.page.height - 60;
  doc.fontSize(8).fillColor(mutedText).font('Helvetica')
    .text('Squatterz LLC · Gainesville, GA', 50, footerY, { width: pw, align: 'center' });
  doc.fontSize(7).fillColor('#4a5a4e').font('Helvetica')
    .text(`Generated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, 50, footerY + 14, { width: pw, align: 'center' });

  doc.end();

  const pdfBuffer = await new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  const filename = `Squatterz-Completion-${workOrderNum}.pdf`;

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

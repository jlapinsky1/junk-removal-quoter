import {
  getServiceClient, verifyAdmin, generateToken, sha256,
  jsonResponse, errorResponse,
} from './_shared/supabase.js';
import { getStripeClient, ikey } from './_shared/stripe.js';

export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const admin = await verifyAdmin(req);
    if (!admin) return errorResponse('Unauthorized', 401);

    const body = await req.json();
    const {
      bookingId,
      // Completion package fields
      completedAt,
      technicianName,
      technicianId,
      itemsRemoved,
      volumeEstimate,
      completionNotes,
      disposalNotes,
      finalAmountCents,
      priceAdjustmentReason,
      afterPhotoStoragePaths,
      // Legacy actuals (still accepted alongside new fields)
      actuals,
      // Dispatch override
      override,
      overrideReason,
    } = body;

    if (!bookingId) return errorResponse('bookingId is required');

    // ── Validate required completion package fields ────────────────────────
    if (!afterPhotoStoragePaths || !Array.isArray(afterPhotoStoragePaths) || afterPhotoStoragePaths.length === 0) {
      return errorResponse('At least one after photo is required to complete the job');
    }
    if (!completionNotes?.trim()) {
      return errorResponse('completionNotes is required');
    }
    if (!itemsRemoved?.trim()) {
      return errorResponse('itemsRemoved is required');
    }
    if (!technicianName?.trim()) {
      return errorResponse('technicianName is required');
    }
    if (!finalAmountCents || !Number.isInteger(finalAmountCents) || finalAmountCents <= 0) {
      return errorResponse('finalAmountCents must be a positive integer');
    }
    if (!completedAt) {
      return errorResponse('completedAt is required');
    }

    // Validate storage paths to prevent path injection
    // All after photos must be under completions/{bookingId}/
    const validPathPrefix = `completions/${bookingId}/`;
    for (const path of afterPhotoStoragePaths) {
      if (!path.startsWith(validPathPrefix)) {
        return errorResponse('Invalid photo storage path');
      }
    }

    const supabase = getServiceClient();

    // ── Load booking ──────────────────────────────────────────────────────
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(
        'id, status, deposit_confirmed_at, stripe_invoice_id, stripe_customer_id, ' +
        'stripe_final_payment_intent_id, customer_email, customer_name, approved_quote'
      )
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) return errorResponse('Booking not found', 404);

    if (!['scheduled', 'in_progress'].includes(booking.status)) {
      if (booking.status === 'completed') {
        return errorResponse('This booking has already been completed', 409);
      }
      return errorResponse(`Cannot complete a booking in '${booking.status}' status`);
    }

    // ── Deposit enforcement ───────────────────────────────────────────────
    if (!booking.deposit_confirmed_at) {
      if (!override || !overrideReason?.trim()) {
        return errorResponse(
          'Deposit has not been confirmed. The deposit must be received before the job can be ' +
          'completed and the final payment requested. Provide override: true and overrideReason to bypass.',
          403
        );
      }
      // Log override (admin audit trail)
      await supabase.from('audit_log').insert({
        booking_id: bookingId,
        event_type: 'dispatch_override',
        admin_id: admin.id,
        reason: overrideReason.trim(),
        metadata: { override_type: 'complete_without_deposit' },
      });
    }

    // ── Validate price adjustment reason if amount differs ────────────────
    const approvedQuoteCents = Math.round(Number(booking.approved_quote) * 100);
    if (finalAmountCents !== approvedQuoteCents && !priceAdjustmentReason?.trim()) {
      return errorResponse(
        'priceAdjustmentReason is required when the final amount differs from the approved quote'
      );
    }

    // ── Idempotency: check if completion already exists ───────────────────
    const { data: existingCompletion } = await supabase
      .from('booking_completions')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (existingCompletion) {
      // Already completed — check if we need to resend the email
      const { data: existingToken } = await supabase
        .from('payment_access_tokens')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('purpose', 'final_payment')
        .is('revoked_at', null)
        .maybeSingle();

      return jsonResponse({
        success: true,
        idempotent: true,
        completionId: existingCompletion.id,
        finalPaymentLinkSent: existingToken != null,
      });
    }

    // ── Save completion record ────────────────────────────────────────────
    const { data: completion, error: completionErr } = await supabase
      .from('booking_completions')
      .insert({
        booking_id: bookingId,
        completed_at: completedAt,
        technician_name: technicianName.trim(),
        technician_id: technicianId?.trim() || null,
        items_removed: itemsRemoved.trim(),
        volume_estimate: volumeEstimate?.trim() || null,
        completion_notes: completionNotes.trim(),
        disposal_notes: disposalNotes?.trim() || null,
        final_amount_cents: finalAmountCents,
        price_adjustment_reason: priceAdjustmentReason?.trim() || null,
        admin_id: admin.id,
      })
      .select('id')
      .single();

    if (completionErr) {
      console.error('Failed to save completion record:', completionErr);
      return errorResponse('Failed to save completion data', 500);
    }

    // ── Save after photos to booking_photos ───────────────────────────────
    if (afterPhotoStoragePaths.length > 0) {
      const photoRows = afterPhotoStoragePaths.map((storagePath, i) => ({
        booking_id: bookingId,
        storage_path: storagePath,
        kind: 'after',
        sort_order: i,
      }));
      await supabase.from('booking_photos').insert(photoRows);
    }

    // ── Update booking status to completed ────────────────────────────────
    const { data: updated, error: updateErr } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        completed_at: completedAt,
        actuals: {
          finalAmount: finalAmountCents / 100,
          finalAmountCents,
          itemsRemoved,
          completionNotes,
          ...(actuals || {}),
        },
      })
      .in('status', ['scheduled', 'in_progress'])
      .eq('id', bookingId)
      .select('id')
      .maybeSingle();

    if (updateErr || !updated) {
      console.error('Booking status update failed:', updateErr);
      // Don't return error — completion record saved, try to continue
    }

    // Update slot reservation
    await supabase
      .from('slot_reservations')
      .update({ status: 'completed' })
      .eq('booking_id', bookingId)
      .in('status', ['reserved', 'confirmed']);

    await supabase.from('audit_log').insert({
      booking_id: bookingId,
      event_type: 'booking_completed',
      admin_id: admin.id,
      after_value: { finalAmountCents, completionId: completion.id },
    });

    // ── Create final PaymentIntent + attach to invoice ────────────────────
    let amountRemainingCents = null;
    let finalPaymentLinkSent = false;

    if (booking.stripe_invoice_id) {
      try {
        const stripe = getStripeClient();

        // Load live invoice for authoritative amount_remaining
        const invoice = await stripe.invoices.retrieve(booking.stripe_invoice_id);
        amountRemainingCents = invoice.amount_remaining;

        if (amountRemainingCents > 0 && !booking.stripe_final_payment_intent_id) {
          // Create final PaymentIntent
          const finalPi = await stripe.paymentIntents.create(
            {
              amount: amountRemainingCents,
              currency: 'usd',
              customer: booking.stripe_customer_id,
              automatic_payment_methods: { enabled: true },
              metadata: {
                booking_id: bookingId,
                invoice_id: booking.stripe_invoice_id,
                payment_stage: 'final',
                environment: process.env.NODE_ENV || 'production',
              },
            },
            { idempotencyKey: ikey.finalPI(bookingId) }
          );

          // Attach to invoice
          await stripe.invoices.attachPayment(booking.stripe_invoice_id, {
            payment_intent: finalPi.id,
          });

          // Save final PI ID
          await supabase
            .from('bookings')
            .update({ stripe_final_payment_intent_id: finalPi.id })
            .eq('id', bookingId);

          await supabase.from('audit_log').insert({
            booking_id: bookingId,
            event_type: 'final_payment_requested',
            admin_id: admin.id,
            metadata: { final_payment_intent_id: finalPi.id, amount_remaining_cents: amountRemainingCents },
          });

          // ── Generate payment access token ──────────────────────────────
          const rawPaymentToken = generateToken();
          const paymentTokenHash = await sha256(rawPaymentToken);
          const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          await supabase.from('payment_access_tokens').insert({
            booking_id: bookingId,
            token_hash: paymentTokenHash,
            purpose: 'final_payment',
            expires_at: tokenExpiry,
          });

          // ── Send ONE customer email with completion + final payment link ──
          if (booking.customer_email) {
            finalPaymentLinkSent = await sendCompletionAndFinalPaymentEmail(
              booking,
              rawPaymentToken,
              amountRemainingCents
            );
          }
        } else if (amountRemainingCents === 0) {
          // Already fully paid (edge case)
          await supabase
            .from('bookings')
            .update({ financially_completed_at: new Date().toISOString() })
            .eq('id', bookingId);
        }
      } catch (stripeErr) {
        console.error('Final payment creation failed:', stripeErr.message, { bookingId });
        // Non-fatal: completion is saved; admin can retry via admin-payment-action
      }
    }

    return jsonResponse({
      success: true,
      completionId: completion.id,
      amountRemainingCents,
      finalPaymentLinkSent,
    });

  } catch (e) {
    console.error('complete-job error:', e);
    return errorResponse('Server error', 500);
  }
}

async function sendCompletionAndFinalPaymentEmail(booking, rawPaymentToken, amountRemainingCents) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;

  const baseUrl = process.env.URL || 'https://squatterz.com';
  const finalPageUrl = `${baseUrl}/invoice/${rawPaymentToken}/final`;
  const remainingDollars = (amountRemainingCents / 100).toFixed(2);
  const firstName = booking.customer_name?.split(' ')[0] || 'there';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@squatterz.com',
        to: booking.customer_email,
        subject: 'Your job is complete: view photos and pay the remaining balance',
        html: `<p>Hi ${firstName},</p>
<p>Great news! Your junk removal job is complete.</p>
<p>Click the link below to view your completion report (including before &amp; after photos) and pay the remaining balance of <strong>$${remainingDollars}</strong>.</p>
<p><a href="${finalPageUrl}" style="background:#22c55e;color:#000;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">View Job Report &amp; Pay $${remainingDollars}</a></p>
<p>This link is secure and expires in 7 days.</p>
<p>Thank you for choosing Squatterz!</p>`,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to send completion email:', e.message);
    return false;
  }
}

export const config = { path: '/api/complete-job' };

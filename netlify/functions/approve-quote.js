import {
  getServiceClient, verifyAdmin, generateToken, sha256,
  jsonResponse, errorResponse,
} from './_shared/supabase.js';
import {
  getStripeClient, getOrCreateStripeCustomer, toCents, ikey,
} from './_shared/stripe.js';

export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const admin = await verifyAdmin(req);
    if (!admin) return errorResponse('Unauthorized', 401);

    const {
      bookingId,
      approvedPrice,
      recommendedPrice,
      estimateSnapshot,
      settingsSnapshot,
      availableSlots,
      expiresAt,
      customerTerms,
      adminOverride,
      decisionContext,
    } = await req.json();

    if (!bookingId || approvedPrice == null || !estimateSnapshot || !customerTerms) {
      return errorResponse('Missing required fields');
    }

    // Validate price is a positive number before any Stripe work
    const approvedPriceCents = toCents(approvedPrice);
    if (!Number.isInteger(approvedPriceCents) || approvedPriceCents <= 0) {
      return errorResponse('approvedPrice must be a positive amount');
    }

    const supabase = getServiceClient();

    // Generate token: raw goes to customer URL, hash stored in DB
    const rawToken = generateToken();
    const tokenHash = await sha256(rawToken);

    const { data, error } = await supabase.rpc('approve_quote_atomic', {
      p_booking_id: bookingId,
      p_admin_id: admin.id,
      p_approved_price: approvedPrice,
      p_recommended_price: recommendedPrice || approvedPrice,
      p_estimate_snapshot: estimateSnapshot,
      p_settings_snapshot: settingsSnapshot || {},
      p_available_slots: availableSlots || [],
      p_expires_at: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      p_customer_terms: customerTerms,
      p_admin_override: adminOverride || null,
      p_token_hash: tokenHash,
      p_decision_context: decisionContext || null,
    });

    if (error) {
      console.error('approve_quote_atomic error:', error);
      return errorResponse(error.message || 'Approval failed', 500);
    }

    const quoteVersion = data.version;

    // ── Stripe: create or reuse customer + invoice ──────────────────────────

    let stripeError = null;
    try {
      const stripe = getStripeClient();

      // Load booking to check existing Stripe objects + get customer info
      const { data: booking, error: bookingErr } = await supabase
        .from('bookings')
        .select(
          'id, customer_name, customer_email, full_address, ' +
          'stripe_customer_id, stripe_invoice_id, deposit_confirmed_at'
        )
        .eq('id', bookingId)
        .single();

      if (bookingErr || !booking) {
        throw new Error('Booking not found after approval');
      }

      // If a new version but deposit already paid, block invoice replacement
      if (quoteVersion > 1 && booking.deposit_confirmed_at) {
        return errorResponse(
          'Cannot revise a quote after deposit has been collected. ' +
          'Use the adjustment workflow.',
          409
        );
      }

      // If re-approving an existing quote version, reuse the invoice (idempotent)
      if (booking.stripe_invoice_id && quoteVersion === (data.version)) {
        // Check if this invoice belongs to this booking via metadata
        try {
          const existingInvoice = await stripe.invoices.retrieve(booking.stripe_invoice_id);
          if (existingInvoice.metadata?.booking_id === bookingId) {
            // Reuse existing invoice — idempotent re-approval
            return jsonResponse({
              ...data,
              quoteToken: rawToken,
              stripeInvoiceId: booking.stripe_invoice_id,
              stripeCustomerId: booking.stripe_customer_id,
            });
          }
        } catch {
          // Invoice not found in Stripe — proceed to create new one
        }
      }

      // If new version and old invoice exists with no deposit: void old invoice
      if (booking.stripe_invoice_id && quoteVersion > 1 && !booking.deposit_confirmed_at) {
        try {
          await stripe.invoices.voidInvoice(booking.stripe_invoice_id);
          await supabase.from('audit_log').insert({
            booking_id: bookingId,
            event_type: 'invoice_voided',
            admin_id: admin.id,
            metadata: {
              old_invoice_id: booking.stripe_invoice_id,
              new_version: quoteVersion,
            },
          });
        } catch (voidErr) {
          console.error('Failed to void old invoice:', voidErr.message);
          // Non-fatal: continue creating new invoice
        }
      }

      // Get or create Stripe Customer
      let customerId = booking.stripe_customer_id;
      if (!customerId) {
        customerId = await getOrCreateStripeCustomer(stripe, booking);
      }

      // Create Invoice (idempotent via idempotency key)
      const invoice = await stripe.invoices.create(
        {
          customer: customerId,
          collection_method: 'send_invoice',
          days_until_due: 30,
          description: `Junk removal – ${booking.full_address}`,
          metadata: {
            booking_id: bookingId,
            quote_version: String(quoteVersion),
            environment: process.env.NODE_ENV || 'production',
          },
        },
        { idempotencyKey: ikey.invoice(bookingId, quoteVersion) }
      );

      // Add line item (must be before finalize)
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id,
        amount: approvedPriceCents,
        currency: 'usd',
        description: `Residential junk removal service – ${booking.full_address}`,
      });

      // Finalize invoice (status: open, immutable line items)
      await stripe.invoices.finalizeInvoice(invoice.id);

      // Persist Stripe IDs to booking
      // If this save fails, the next request will find the invoice via idempotency key
      await supabase
        .from('bookings')
        .update({
          stripe_customer_id: customerId,
          stripe_invoice_id: invoice.id,
        })
        .eq('id', bookingId);

      return jsonResponse({
        ...data,
        quoteToken: rawToken, // only returned once — admin sends this to customer
        stripeInvoiceId: invoice.id,
        stripeCustomerId: customerId,
      });

    } catch (e) {
      stripeError = e;
      console.error('Stripe setup error (quote approval succeeded):', e.message, {
        bookingId,
        quoteVersion,
      });
    }

    // Quote approval in DB succeeded even if Stripe failed.
    // Return the token so admin can share the link; reconcile Stripe later.
    return jsonResponse({
      ...data,
      quoteToken: rawToken,
      stripeSetupError: 'Payment infrastructure setup failed. Use Reconcile Stripe Status to retry.',
    });

  } catch (e) {
    console.error('approve-quote error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/approve-quote' };

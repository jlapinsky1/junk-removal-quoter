import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CUSTOMER_TERMS } from '../utils/quoteSnapshot';
import { getRepo } from '../utils/repository';

export default function ApprovedQuote() {
  const { id } = useParams();
  const [quoteData, setQuoteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmations, setConfirmations] = useState([false, false, false]);

  useEffect(() => {
    (async () => {
      try {
        const repo = await getRepo();
        const data = await repo.getCustomerQuote(id);
        setQuoteData(data);
        if (data?.booking?.status === 'scheduled') setAccepted(true);
      } catch {
        // Failed to load
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!quoteData || !quoteData.quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-bold text-gray-800">Quote Not Found</h2>
          <p className="text-gray-500 mt-2">This quote link may be expired or invalid.</p>
        </div>
      </div>
    );
  }

  const { booking, quote, bookedSlots = [] } = quoteData;
  const isExpired = quote.expiresAt && new Date(quote.expiresAt) < new Date();

  // Build available slots, filtering out booked ones
  const allSlots = quote.availableSlots || [];
  const bookedSet = new Set(bookedSlots.map(s =>
    `${s.resource_id || s.resourceId}:${s.pickup_date || s.pickupDate}:${s.start_time || s.startTime}`
  ));
  const availableSlots = allSlots.filter(s => {
    const key = `${s.resourceId || 'truck-1'}:${s.date}:${s.startTime}`;
    return !bookedSet.has(key);
  });

  const terms = quote.customerTerms || CUSTOMER_TERMS;
  const allConfirmed = confirmations.every(Boolean);

  if (accepted || booking.status === 'scheduled') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">You're All Set!</h2>
          <p className="text-gray-600">Your junk removal pickup has been confirmed.</p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
            <div className="font-bold text-lg text-gray-900">${quote.price}</div>
            <div className="text-gray-600">
              <span className="font-medium">Address:</span> {booking.address}
            </div>
          </div>
          <p className="text-sm text-gray-500">
            We'll send a reminder before your pickup. Need to reschedule? Call us at the number in your confirmation email.
          </p>
        </div>
      </div>
    );
  }

  async function handleAccept() {
    setError(null);

    if (!allConfirmed) {
      setError('Please confirm all items below before accepting.');
      return;
    }

    // For structured slots, parse the selected slot
    let pickupDate, startTime, endTime, resourceId;
    const slot = availableSlots.find(s => JSON.stringify(s) === selectedSlot);
    if (slot) {
      pickupDate = slot.date;
      startTime = slot.startTime;
      endTime = slot.endTime;
      resourceId = slot.resourceId || 'truck-1';
    } else if (selectedSlot) {
      // Legacy string slot — pass as-is
      pickupDate = booking.preferredDate;
      startTime = '08:00';
      endTime = '12:00';
      resourceId = 'truck-1';
    }

    setSubmitting(true);
    try {
      const repo = await getRepo();
      const result = await repo.acceptQuote(id, {
        resourceId,
        pickupDate,
        startTime,
        endTime,
        confirmations: terms.customerConfirmations,
        idempotencyKey: `accept-${id}-${Date.now()}`,
      });

      if (result.success) {
        setAccepted(true);
      } else {
        setError(result.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleConfirmation(index) {
    setConfirmations(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Your Junk Removal Quote</h1>
          <p className="text-gray-500 mt-1">Hi {booking.customerName?.split(' ')[0]}, here's your personalized quote</p>
        </div>

        {/* Price card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="text-sm text-gray-500 mb-1">Total Price</div>
          <div className="text-4xl font-bold text-gray-900">${quote.price}</div>
          <div className="text-sm text-gray-400 mt-2">No hidden fees</div>
        </div>

        {/* Quote protection notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          {terms.priceAdjustmentNotice}
        </div>

        {/* What's included */}
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <h3 className="font-bold text-gray-800 mb-3">What's included</h3>
          <div className="space-y-2">
            {terms.included.map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </div>
            ))}
          </div>
          {terms.excluded?.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs text-gray-500 font-medium mb-1">Not included:</div>
              {terms.excluded.map(item => (
                <div key={item} className="text-sm text-gray-500">{item}</div>
              ))}
            </div>
          )}
        </div>

        {/* Pickup details */}
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <h3 className="font-bold text-gray-800 mb-3">Pickup details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Address</span>
              <span className="text-gray-800 font-medium text-right">{booking.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Items</span>
              <span className="text-gray-800 font-medium">{booking.quantity}</span>
            </div>
          </div>
        </div>

        {/* Time slot selection */}
        {availableSlots.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-bold text-gray-800 mb-3">Choose your pickup time</h3>
            <div className="space-y-2">
              {availableSlots.map((slot, i) => {
                const slotKey = JSON.stringify(slot);
                const label = slot.label || `${slot.date} ${slot.startTime}-${slot.endTime}`;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedSlot(slotKey)}
                    className={`w-full text-left p-3 rounded-xl border text-sm font-medium transition-colors ${
                      selectedSlot === slotKey
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {allSlots.length > availableSlots.length && (
              <p className="text-xs text-gray-400 mt-2">
                Some time slots are no longer available.
              </p>
            )}
          </div>
        )}

        {/* Confirmation checkboxes */}
        {!isExpired && (
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-bold text-gray-800 mb-3">Before you accept</h3>
            <div className="space-y-3">
              {terms.customerConfirmations.map((text, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmations[i]}
                    onChange={() => toggleConfirmation(i)}
                    className="mt-0.5 rounded"
                  />
                  <span className="text-sm text-gray-700">{text}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Expiration */}
        {quote.expiresAt && (
          <div className={`text-center text-sm ${isExpired ? 'text-red-500' : 'text-gray-400'}`}>
            {isExpired
              ? 'This quote has expired. Please contact us for an updated price.'
              : `Quote valid until ${new Date(quote.expiresAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
            }
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Accept button */}
        {!isExpired && (
          <button
            onClick={handleAccept}
            disabled={!allConfirmed || (availableSlots.length > 0 && !selectedSlot) || submitting}
            className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold shadow-lg disabled:opacity-40 disabled:shadow-none active:bg-green-700 transition-colors"
          >
            {submitting ? 'Processing...' : 'Accept & Schedule Pickup'}
          </button>
        )}

        {/* Fine print */}
        <div className="text-xs text-gray-400 text-center space-y-1 px-4">
          <p>{terms.priceAdjustmentNotice}</p>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getBookingById, acceptQuote } from '../utils/bookings';

export default function ApprovedQuote() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const b = getBookingById(id);
    setBooking(b);
    setLoading(false);
    if (b?.status === 'scheduled') setAccepted(true);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!booking || !booking.approvedQuote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-bold text-gray-800">Quote Not Found</h2>
          <p className="text-gray-500 mt-2">This quote link may be expired or invalid.</p>
        </div>
      </div>
    );
  }

  const isExpired = booking.quoteExpiresAt && new Date(booking.quoteExpiresAt) < new Date();

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
            <div className="font-bold text-lg text-gray-900">${booking.approvedQuote}</div>
            {booking.scheduledPickup && (
              <div className="text-gray-600">
                <span className="font-medium">Pickup:</span> {booking.scheduledPickup}
              </div>
            )}
            <div className="text-gray-600">
              <span className="font-medium">Address:</span> {booking.fullAddress}
            </div>
          </div>
          <p className="text-sm text-gray-500">
            We'll send a reminder before your pickup. Need to reschedule? Call us at the number in your confirmation email.
          </p>
        </div>
      </div>
    );
  }

  function handleAccept() {
    if (booking.availableSlots?.length > 0 && !selectedSlot) {
      alert('Please select a pickup time');
      return;
    }
    acceptQuote(booking.id, {
      scheduledPickup: selectedSlot || `${booking.preferredDate} - ${booking.preferredTime}`,
    });
    setAccepted(true);
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
          <div className="text-4xl font-bold text-gray-900">${booking.approvedQuote}</div>
          <div className="text-sm text-gray-400 mt-2">No hidden fees</div>
        </div>

        {/* What's included */}
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <h3 className="font-bold text-gray-800 mb-3">What's included</h3>
          <div className="space-y-2">
            {[
              'Professional loading & hauling',
              'All labor included',
              'Responsible disposal & recycling',
              'Cleanup of the pickup area',
              'All dump fees included',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Pickup details */}
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <h3 className="font-bold text-gray-800 mb-3">Pickup details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Address</span>
              <span className="text-gray-800 font-medium text-right">{booking.fullAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Items</span>
              <span className="text-gray-800 font-medium">{booking.quantity}</span>
            </div>
          </div>
        </div>

        {/* Time slot selection */}
        {booking.availableSlots?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-bold text-gray-800 mb-3">Choose your pickup time</h3>
            <div className="space-y-2">
              {booking.availableSlots.map(slot => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`w-full text-left p-3 rounded-xl border text-sm font-medium transition-colors ${
                    selectedSlot === slot
                      ? 'bg-blue-50 border-blue-500 text-blue-800'
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Expiration */}
        {booking.quoteExpiresAt && (
          <div className={`text-center text-sm ${isExpired ? 'text-red-500' : 'text-gray-400'}`}>
            {isExpired
              ? 'This quote has expired. Please contact us for an updated price.'
              : `Quote valid until ${new Date(booking.quoteExpiresAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
            }
          </div>
        )}

        {/* Accept button */}
        {!isExpired && (
          <button
            onClick={handleAccept}
            className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold shadow-lg active:bg-green-700 transition-colors"
          >
            Accept & Schedule Pickup
          </button>
        )}

        {/* Fine print */}
        <div className="text-xs text-gray-400 text-center space-y-1 px-4">
          <p>Final price may change if load size or materials differ significantly from photos or description.</p>
          <p>Hazardous materials, chemicals, and paint are not included.</p>
        </div>
      </div>
    </div>
  );
}

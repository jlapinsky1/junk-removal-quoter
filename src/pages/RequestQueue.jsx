import React, { useState, useEffect } from 'react';
import { getBookings, updateBooking, approveBooking, deleteBooking, STATUS_LABELS, STATUS_COLORS } from '../utils/bookings';
import { calculateQuote } from '../utils/pricing';
import { getSettings } from '../utils/storage';

const ACCESS_MAP = {
  curbside: 'Curbside / already outside',
  garage: 'Garage / driveway',
  first_floor: 'Inside first floor',
  upstairs: 'Upstairs / basement',
  basement: 'Upstairs / basement',
};

const STAIRS_LABELS = {
  none: 'No stairs',
  few: 'A few steps',
  one_flight: 'One flight',
  multiple: 'Multiple flights',
};

export default function RequestQueue() {
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setBookings(getBookings());
  }, []);

  function refresh() {
    setBookings(getBookings());
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  if (selected) {
    return <RequestDetail booking={selected} onBack={() => { setSelected(null); refresh(); }} />;
  }

  const pendingCount = bookings.filter(b => b.status === 'pending_review').length;

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800">
          Customer Requests
          {pendingCount > 0 && (
            <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount} new</span>
          )}
        </h2>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {['all', 'pending_review', 'quote_sent', 'scheduled', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No requests</p>
          <p className="text-sm mt-1">Customer submissions will appear here</p>
        </div>
      )}

      {filtered.map(booking => (
        <button
          key={booking.id}
          onClick={() => setSelected(booking)}
          className="w-full text-left bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800">{booking.customerName || 'No name'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status]}`}>
                  {STATUS_LABELS[booking.status]}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1 truncate">{booking.fullAddress || 'No address'}</div>
              <div className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                <span>{booking.quantity}</span>
                <span>{booking.photoCount} photos</span>
                <span>{new Date(booking.createdAt).toLocaleDateString()}</span>
              </div>
              {booking.approvedQuote && (
                <div className="text-sm font-bold text-green-700 mt-1">${booking.approvedQuote}</div>
              )}
            </div>
            <svg className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
}

function RequestDetail({ booking, onBack }) {
  const [data, setData] = useState(booking);
  const [quotePrice, setQuotePrice] = useState(booking.approvedQuote || '');
  const [expiresIn, setExpiresIn] = useState(7);
  const [slots, setSlots] = useState(booking.availableSlots?.join('\n') || '');
  const [internalNotes, setInternalNotes] = useState(booking.internalNotes || '');
  const [showPhotos, setShowPhotos] = useState(false);
  const [autoQuote, setAutoQuote] = useState(null);

  function handleAutoPrice() {
    const settings = getSettings();
    const accessType = ACCESS_MAP[data.accessType] || 'Curbside / already outside';
    const addOns = [];
    if (data.stairs === 'one_flight' || data.stairs === 'multiple') addOns.push('Stairs');

    let loadSize = 'Half truck/trailer';
    if (data.quantity === 'A few items (1-5)') loadSize = 'Normal small job';
    else if (data.quantity === 'A room worth of stuff') loadSize = 'Quarter truck/trailer';
    else if (data.quantity === 'Multiple rooms') loadSize = 'Three-quarter truck/trailer';
    else if (data.quantity === 'Whole house / cleanout') loadSize = 'Full truck/trailer';

    const result = calculateQuote({
      loadSize,
      accessType,
      addOns,
      numberOfDumpLoads: 1,
      priceSensitivity: 'balanced',
      homeBaseToJob: 0,
      jobToLandfill: 0,
      landfillToHomeBase: 0,
      estimatedJobTime: 0,
    }, settings);

    setAutoQuote(result);
    setQuotePrice(result.suggestedQuote);
  }

  function handleApprove() {
    if (!quotePrice) return;
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + expiresIn);
    const availableSlots = slots.split('\n').map(s => s.trim()).filter(Boolean);

    approveBooking(data.id, {
      approvedQuote: Number(quotePrice),
      quoteExpiresAt: expDate.toISOString(),
      availableSlots,
    });

    if (internalNotes !== data.internalNotes) {
      updateBooking(data.id, { internalNotes });
    }

    alert(`Quote approved! Customer quote page: ${window.location.origin}/quote/${data.id}`);
    onBack();
  }

  function handleStatusChange(status) {
    updateBooking(data.id, { status });
    setData(prev => ({ ...prev, status }));
  }

  function handleDelete() {
    if (!confirm('Delete this request permanently?')) return;
    deleteBooking(data.id);
    onBack();
  }

  function handleSaveNotes() {
    updateBooking(data.id, { internalNotes });
    alert('Notes saved');
  }

  return (
    <div className="space-y-4 pb-8">
      <button onClick={onBack} className="flex items-center gap-1 text-blue-600 text-sm font-medium">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to requests
      </button>

      {/* Status */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">{data.customerName}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[data.status]}`}>
            {STATUS_LABELS[data.status]}
          </span>
        </div>
        <div className="text-sm text-gray-600 mt-1">{data.customerPhone}</div>
        {data.customerEmail && <div className="text-sm text-gray-600">{data.customerEmail}</div>}
        <div className="text-sm text-gray-600 mt-2">{data.fullAddress}</div>
        <div className="text-xs text-gray-400 mt-2">
          Submitted {new Date(data.createdAt).toLocaleString()}
        </div>
      </div>

      {/* Request details */}
      <div className="bg-white rounded-xl border p-4 space-y-2">
        <h3 className="font-bold text-gray-800">Request Details</h3>
        <Row label="Quantity" value={data.quantity} />
        <Row label="Access" value={data.accessType} />
        <Row label="Stairs" value={STAIRS_LABELS[data.stairs] || data.stairs} />
        {data.elevator === 'yes' && <Row label="Elevator" value="Yes" />}
        <Row label="Preferred date" value={data.preferredDate ? new Date(data.preferredDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Not specified'} />
        <Row label="Preferred time" value={data.preferredTime} />
        {data.description && (
          <div className="pt-2 border-t">
            <div className="text-xs text-gray-500 font-medium">Customer notes:</div>
            <div className="text-sm text-gray-700 mt-1">{data.description}</div>
          </div>
        )}
      </div>

      {/* Detected items */}
      {data.detectedItems?.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-bold text-gray-800 mb-2">Items Identified</h3>
          <div className="space-y-1">
            {data.detectedItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.item}</span>
                <span className="text-gray-500">x{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      <div className="bg-white rounded-xl border p-4">
        <button
          onClick={() => setShowPhotos(!showPhotos)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="font-bold text-gray-800">Photos ({data.photoCount})</h3>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${showPhotos ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showPhotos && data.photos && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {data.photos.map((photo, i) => (
              <img key={i} src={photo} alt={`Photo ${i + 1}`} className="w-full rounded-lg" />
            ))}
          </div>
        )}
      </div>

      {/* Pricing / Approve */}
      {(data.status === 'pending_review' || data.status === 'quote_sent') && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-bold text-gray-800">Set Quote Price</h3>

          <button
            onClick={handleAutoPrice}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium"
          >
            Auto-calculate suggested price
          </button>

          {autoQuote && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
              <Row label="Base price" value={`$${autoQuote.basePrice}`} />
              <Row label="Access modifier" value={`$${autoQuote.accessModifier}`} />
              <Row label="Add-ons" value={`$${autoQuote.addOnsTotal}`} />
              <div className="border-t pt-1 font-bold">
                <Row label="Suggested" value={`$${autoQuote.suggestedQuote}`} />
              </div>
              <div className="text-xs text-gray-500">
                {(autoQuote.estimatedMargin * 100).toFixed(0)}% margin
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Final quote price ($)</label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-lg font-bold"
              value={quotePrice}
              onChange={e => setQuotePrice(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quote valid for (days)</label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={expiresIn}
              onChange={e => setExpiresIn(Number(e.target.value))}
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Available time slots (one per line)</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={3}
              value={slots}
              onChange={e => setSlots(e.target.value)}
              placeholder={"Mon Jul 21, 8am-12pm\nTue Jul 22, 1pm-5pm"}
            />
          </div>

          <button
            onClick={handleApprove}
            disabled={!quotePrice}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold disabled:opacity-40"
          >
            {data.status === 'quote_sent' ? 'Update Quote' : 'Approve & Send Quote'}
          </button>
        </div>
      )}

      {/* Internal notes */}
      <div className="bg-white rounded-xl border p-4 space-y-2">
        <h3 className="font-bold text-gray-800">Internal Notes</h3>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm"
          rows={3}
          value={internalNotes}
          onChange={e => setInternalNotes(e.target.value)}
          placeholder="Internal notes (not visible to customer)..."
        />
        <button onClick={handleSaveNotes} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
          Save Notes
        </button>
      </div>

      {/* Status actions */}
      <div className="bg-white rounded-xl border p-4 space-y-2">
        <h3 className="font-bold text-gray-800">Update Status</h3>
        <div className="grid grid-cols-2 gap-2">
          {data.status !== 'completed' && (
            <button
              onClick={() => handleStatusChange('completed')}
              className="bg-green-50 text-green-700 py-2 rounded-lg text-sm font-medium"
            >
              Mark Completed
            </button>
          )}
          {data.status !== 'declined' && (
            <button
              onClick={() => handleStatusChange('declined')}
              className="bg-red-50 text-red-700 py-2 rounded-lg text-sm font-medium"
            >
              Decline
            </button>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="w-full bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium mt-2"
        >
          Delete Request
        </button>
      </div>

      {/* Customer quote link */}
      {data.status === 'quote_sent' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-sm font-medium text-blue-800 mb-1">Customer quote link:</div>
          <div className="text-xs text-blue-600 break-all font-mono bg-white rounded p-2">
            {window.location.origin}/quote/{data.id}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/quote/${data.id}`);
              alert('Link copied!');
            }}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium w-full"
          >
            Copy Link
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

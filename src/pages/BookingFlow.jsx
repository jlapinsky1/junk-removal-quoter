import React, { useState, useRef } from 'react';
import { saveBooking } from '../utils/bookings';

const STEPS = ['Contact', 'Address', 'Photos', 'Details', 'Schedule'];

const QUANTITY_OPTIONS = [
  'A few items (1-5)',
  'A room worth of stuff',
  'Multiple rooms',
  'Whole house / cleanout',
];

const ACCESS_OPTIONS = [
  { value: 'curbside', label: 'Already outside / curbside' },
  { value: 'garage', label: 'Garage or driveway' },
  { value: 'first_floor', label: 'Inside, first floor' },
  { value: 'upstairs', label: 'Upstairs' },
  { value: 'basement', label: 'Basement' },
];

const STAIRS_OPTIONS = [
  { value: 'none', label: 'No stairs' },
  { value: 'few', label: 'A few steps (1-5)' },
  { value: 'one_flight', label: 'One flight of stairs' },
  { value: 'multiple', label: 'Multiple flights' },
];

const ELEVATOR_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes, elevator available' },
];

const TIME_PREFERENCES = [
  { value: 'morning', label: 'Morning (8am - 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm - 4pm)' },
  { value: 'flexible', label: 'Flexible / either works' },
];

function generateNextDays(count) {
  const days = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) {
      days.push(d.toISOString().split('T')[0]);
    }
  }
  return days.slice(0, count);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function BookingFlow() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiItems, setAiItems] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    photos: [],
    photoNames: [],
    detectedItems: [],
    description: '',
    quantity: '',
    accessType: 'curbside',
    stairs: 'none',
    elevator: 'no',
    preferredDate: '',
    secondChoiceDate: '',
    timePreference: 'morning',
  });

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  function canProceed() {
    switch (step) {
      case 0: return form.firstName.trim() && form.phone.trim();
      case 1: return form.address.trim() && form.city.trim() && form.zip.trim();
      case 2: return form.photos.length >= 3;
      case 3: return form.quantity;
      case 4: return form.preferredDate && form.timePreference;
      default: return true;
    }
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files);
    const maxPhotos = 10;
    const remaining = maxPhotos - form.photos.length;
    const toProcess = files.slice(0, remaining);

    const newPhotos = [];
    const newNames = [];

    for (const file of toProcess) {
      const resized = await resizeImage(file, 1200);
      newPhotos.push(resized);
      newNames.push(file.name);
    }

    setForm(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos],
      photoNames: [...prev.photoNames, ...newNames],
    }));
  }

  function removePhoto(index) {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
      photoNames: prev.photoNames.filter((_, i) => i !== index),
    }));
    setAiItems(null);
  }

  async function analyzePhotos() {
    setAnalyzing(true);
    try {
      const images = form.photos.map(dataUrl => {
        const [meta, data] = dataUrl.split(',');
        const mediaType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { mediaType, data };
      });

      const response = await fetch('/api/analyze-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });

      if (response.ok) {
        const { items } = await response.json();
        setAiItems(items);
        setForm(prev => ({ ...prev, detectedItems: items }));
      } else {
        setAiItems([]);
      }
    } catch {
      setAiItems([]);
    }
    setAnalyzing(false);
  }

  function removeDetectedItem(index) {
    setForm(prev => ({
      ...prev,
      detectedItems: prev.detectedItems.filter((_, i) => i !== index),
    }));
    setAiItems(prev => prev?.filter((_, i) => i !== index));
  }

  function updateDetectedItem(index, field, value) {
    setForm(prev => {
      const items = [...prev.detectedItems];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, detectedItems: items };
    });
    setAiItems(prev => {
      if (!prev) return prev;
      const items = [...prev];
      items[index] = { ...items[index], [field]: value };
      return items;
    });
  }

  function handleSubmit() {
    const id = saveBooking({
      customerName: `${form.firstName} ${form.lastName}`.trim(),
      customerPhone: form.phone,
      customerEmail: form.email,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      fullAddress: `${form.address}, ${form.city}, ${form.state} ${form.zip}`,
      photoCount: form.photos.length,
      photos: form.photos,
      detectedItems: form.detectedItems,
      description: form.description,
      quantity: form.quantity,
      accessType: form.accessType,
      stairs: form.stairs,
      elevator: form.elevator,
      preferredDate: form.preferredDate,
      secondChoiceDate: form.secondChoiceDate,
      timePreference: form.timePreference,
    });
    setBookingId(id);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Request Submitted!</h2>
          <p className="text-gray-600">
            We've received your junk removal request. We'll review your photos and details, then send you a firm quote within a few hours.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">Preferred date:</span> {formatDate(form.preferredDate)}</p>
            {form.secondChoiceDate && <p><span className="font-medium">Second choice:</span> {formatDate(form.secondChoiceDate)}</p>}
            <p><span className="font-medium">Time preference:</span> {TIME_PREFERENCES.find(t => t.value === form.timePreference)?.label || form.timePreference}</p>
            <p><span className="font-medium">Confirmation #:</span> {bookingId.slice(0, 8).toUpperCase()}</p>
          </div>
          <p className="text-sm text-gray-500">
            Check your email for updates and your personalized quote.
          </p>
        </div>
      </div>
    );
  }

  const availableDays = generateNextDays(14);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900 text-center">Book Junk Removal</h1>
          {/* Progress bar */}
          <div className="flex items-center gap-1 mt-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${
                  i <= step ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
                <div className={`text-[10px] text-center mt-1 ${
                  i === step ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}>
                  {s}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {step === 0 && (
          <StepCard title="Your contact info" subtitle="So we can send you the quote">
            <Input label="First name" value={form.firstName} onChange={v => update('firstName', v)} autoFocus />
            <Input label="Last name" value={form.lastName} onChange={v => update('lastName', v)} />
            <Input label="Phone number" type="tel" value={form.phone} onChange={v => update('phone', v)} placeholder="(555) 555-5555" />
            <Input label="Email (optional)" type="email" value={form.email} onChange={v => update('email', v)} placeholder="you@example.com" />
          </StepCard>
        )}

        {step === 1 && (
          <StepCard title="Where is the pickup?" subtitle="The address where we'll pick up the junk">
            <Input label="Street address" value={form.address} onChange={v => update('address', v)} autoFocus placeholder="123 Main St" />
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input label="City" value={form.city} onChange={v => update('city', v)} />
              </div>
              <Input label="State" value={form.state} onChange={v => update('state', v)} placeholder="GA" />
            </div>
            <Input label="ZIP code" value={form.zip} onChange={v => update('zip', v)} placeholder="30301" />
          </StepCard>
        )}

        {step === 2 && (
          <StepCard title="Show us what needs to go" subtitle="Upload 3-10 photos of the items">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />

              {form.photos.length < 10 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-blue-300 rounded-xl p-6 text-center hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-8 h-8 text-blue-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-blue-600 font-medium text-sm">
                    Tap to add photos
                  </span>
                  <span className="block text-gray-400 text-xs mt-1">
                    {form.photos.length}/10 photos ({Math.max(0, 3 - form.photos.length)} more required)
                  </span>
                </button>
              )}

              {form.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {form.photos.map((photo, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {form.photos.length >= 3 && !aiItems && (
                <button
                  onClick={analyzePhotos}
                  disabled={analyzing}
                  className="w-full mt-3 bg-purple-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-50"
                >
                  {analyzing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Identifying items...
                    </span>
                  ) : (
                    'Auto-detect items from photos'
                  )}
                </button>
              )}

              {aiItems && aiItems.length > 0 && (
                <div className="mt-3 bg-purple-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-sm font-medium text-purple-800">We found these items - confirm or edit:</span>
                  </div>
                  {aiItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2">
                      <input
                        type="text"
                        value={item.item}
                        onChange={e => updateDetectedItem(i, 'item', e.target.value)}
                        className="flex-1 text-sm border rounded-lg px-2 py-1.5"
                      />
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => updateDetectedItem(i, 'quantity', Number(e.target.value))}
                        className="w-14 text-sm border rounded-lg px-2 py-1.5 text-center"
                      />
                      <button
                        onClick={() => removeDetectedItem(i)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {aiItems && aiItems.length === 0 && (
                <p className="mt-2 text-sm text-gray-500 text-center">
                  Couldn't auto-detect items. No worries - just describe them below!
                </p>
              )}
            </div>
          </StepCard>
        )}

        {step === 3 && (
          <StepCard title="Tell us more" subtitle="Help us prepare the right crew and truck">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">How much stuff?</label>
              <div className="space-y-2">
                {QUANTITY_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => update('quantity', opt)}
                    className={`w-full text-left p-3 rounded-xl border text-sm font-medium transition-colors ${
                      form.quantity === opt
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Where are the items?</label>
              <div className="space-y-2">
                {ACCESS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => update('accessType', opt.value)}
                    className={`w-full text-left p-3 rounded-xl border text-sm font-medium transition-colors ${
                      form.accessType === opt.value
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Any stairs?</label>
              <div className="grid grid-cols-2 gap-2">
                {STAIRS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => update('stairs', opt.value)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                      form.stairs === opt.value
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {(form.accessType === 'upstairs' || form.accessType === 'basement') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Elevator available?</label>
                <div className="grid grid-cols-2 gap-2">
                  {ELEVATOR_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => update('elevator', opt.value)}
                      className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                        form.elevator === opt.value
                          ? 'bg-blue-50 border-blue-500 text-blue-800'
                          : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anything else we should know? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                className="w-full border rounded-xl px-3 py-2.5 text-sm"
                rows={3}
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="e.g. Old furniture from a renovation, some items are heavy..."
              />
            </div>
          </StepCard>
        )}

        {step === 4 && (
          <StepCard title="When works best for you?" subtitle="We'll confirm your pickup time after reviewing your request">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred day</label>
              <div className="grid grid-cols-2 gap-2">
                {availableDays.map(day => (
                  <button
                    key={day}
                    onClick={() => update('preferredDate', day)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                      form.preferredDate === day
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : form.secondChoiceDate === day
                        ? 'bg-gray-50 border-gray-400 text-gray-700'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    {formatDate(day)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Second choice <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableDays.filter(d => d !== form.preferredDate).map(day => (
                  <button
                    key={day}
                    onClick={() => update('secondChoiceDate', form.secondChoiceDate === day ? '' : day)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                      form.secondChoiceDate === day
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    {formatDate(day)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time preference</label>
              <div className="space-y-2">
                {TIME_PREFERENCES.map(pref => (
                  <button
                    key={pref.value}
                    onClick={() => update('timePreference', pref.value)}
                    className={`w-full text-left p-3 rounded-xl border text-sm font-medium transition-colors ${
                      form.timePreference === pref.value
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    {pref.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              Your preferred time is not confirmed until we review your request and send you a quote. You'll choose from available time slots when you accept the quote.
            </div>
          </StepCard>
        )}

        {/* Navigation buttons */}
        <div className="mt-6 space-y-3">
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              disabled={!canProceed()}
              className="w-full bg-blue-600 text-white py-4 rounded-xl text-base font-bold shadow-lg disabled:opacity-40 disabled:shadow-none active:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed()}
              className="w-full bg-green-600 text-white py-4 rounded-xl text-base font-bold shadow-lg disabled:opacity-40 disabled:shadow-none active:bg-green-700 transition-colors"
            >
              Submit Request
            </button>
          )}

          {step > 0 && (
            <button
              onClick={back}
              className="w-full text-gray-500 py-3 text-sm font-medium"
            >
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, autoFocus }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        className="w-full border rounded-xl px-3 py-2.5 text-sm"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}

function resizeImage(file, maxWidth) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

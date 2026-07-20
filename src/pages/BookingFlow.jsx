import React, { useState, useRef } from 'react';
import { getRepo } from '../utils/repository';

const STEPS = [
  { key: 'info', label: 'Your Info', icon: UserIcon, description: 'Tell us where to send your estimate' },
  { key: 'location', label: 'Pickup Location', icon: PinIcon, description: 'Where should we pick up?' },
  { key: 'photos', label: 'Photos', icon: CameraIcon, description: 'Show us what needs to go' },
  { key: 'details', label: 'Job Details', icon: ClipboardIcon, description: 'Help us send the right crew' },
  { key: 'schedule', label: 'Pickup Time', icon: CalendarIcon, description: 'When works best for you?' },
];

const QUANTITY_OPTIONS = [
  { value: 'A few items (1-5)', label: 'A few items', sub: '1-5 pieces', icon: '1-5' },
  { value: 'A room worth of stuff', label: 'A room\'s worth', sub: 'Furniture, boxes, etc.', icon: '~10' },
  { value: 'Multiple rooms', label: 'Multiple rooms', sub: 'Bigger job', icon: '20+' },
  { value: 'Whole house / cleanout', label: 'Full cleanout', sub: 'Whole house or estate', icon: '50+' },
];

const ACCESS_OPTIONS = [
  { value: 'curbside', label: 'Curbside / outside', icon: '🏠' },
  { value: 'garage', label: 'Garage or driveway', icon: '🚗' },
  { value: 'first_floor', label: 'Inside, first floor', icon: '🚪' },
  { value: 'upstairs', label: 'Upstairs', icon: '⬆' },
  { value: 'basement', label: 'Basement', icon: '⬇' },
];

const STAIRS_OPTIONS = [
  { value: 'none', label: 'No stairs' },
  { value: 'few', label: 'A few steps' },
  { value: 'one_flight', label: 'One flight' },
  { value: 'multiple', label: 'Multiple flights' },
];

const ELEVATOR_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes, elevator available' },
];

const TIME_PREFERENCES = [
  { value: 'morning', label: 'Morning', sub: '8am - 12pm', icon: '☀' },
  { value: 'afternoon', label: 'Afternoon', sub: '12pm - 4pm', icon: '🌤' },
  { value: 'flexible', label: 'Flexible', sub: 'Either works for me', icon: '👍' },
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

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return { weekday: d.toLocaleDateString('en-US', { weekday: 'short' }), date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
}

export default function BookingFlow() {
  const [step, setStep] = useState(-1); // -1 = hero
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
    else if (step === 0) setStep(-1);
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

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const repo = await getRepo();
      const result = await repo.createBooking({
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
        aiDetectedItems: form.detectedItems,
        description: form.description,
        quantity: form.quantity,
        accessType: form.accessType,
        stairs: form.stairs,
        elevator: form.elevator,
        preferredDate: form.preferredDate,
        secondChoiceDate: form.secondChoiceDate,
        timePreference: form.timePreference,
        sessionId: form.sessionId,
        idempotencyKey: form.idempotencyKey,
      });
      setBookingId(result.bookingId || result.id);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ──────────────────────── SUCCESS SCREEN ────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-5">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white mb-3">You're All Set!</h1>
          <p className="text-gray-400 text-lg mb-8">
            We'll review your photos and send you a firm estimate. No surprises.
          </p>

          <div className="bg-gray-900 rounded-2xl p-6 text-left space-y-3 border border-gray-800">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Preferred date</span>
              <span className="text-white font-semibold">{formatDate(form.preferredDate)}</span>
            </div>
            {form.secondChoiceDate && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Second choice</span>
                <span className="text-white font-semibold">{formatDate(form.secondChoiceDate)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Time</span>
              <span className="text-white font-semibold">
                {TIME_PREFERENCES.find(t => t.value === form.timePreference)?.label || form.timePreference}
              </span>
            </div>
            <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
              <span className="text-gray-500 text-sm">Confirmation</span>
              <span className="text-green-400 font-mono font-bold tracking-wider">
                #{bookingId.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <TrustBadge icon={CheckCircleIcon} text="A real person will review your request" />
            <TrustBadge icon={CheckCircleIcon} text="Estimate sent within a few hours" />
            <TrustBadge icon={CheckCircleIcon} text="No obligation - review before you commit" />
          </div>
        </div>
      </div>
    );
  }

  const availableDays = generateNextDays(14);
  const progressPercent = step < 0 ? 0 : ((step + 1) / STEPS.length) * 100;

  // ──────────────────────── HERO LANDING ────────────────────────
  if (step === -1) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        {/* Hero */}
        <div className="px-5 pt-14 pb-10 max-w-lg mx-auto">
          <div className="mb-2">
            <span className="inline-block bg-green-500/15 text-green-400 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border border-green-500/30">
              Junk Pickup
            </span>
          </div>
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight mt-4">
            Junk Gone.<br />
            <span className="text-green-400">Fast & Easy.</span>
          </h1>
          <p className="text-gray-400 text-lg mt-4 leading-relaxed max-w-sm">
            Snap a few photos, get a fair estimate, and we'll haul it all away. No phone calls. No hassle.
          </p>

          <button
            onClick={() => setStep(0)}
            className="mt-8 w-full bg-green-500 hover:bg-green-400 text-gray-950 font-extrabold text-lg py-5 rounded-2xl transition-colors shadow-lg shadow-green-500/25 active:scale-[0.98] transform"
          >
            Get Your Free Estimate
          </button>
          <p className="text-center text-gray-600 text-sm mt-3">Takes about 2 minutes</p>
        </div>

        {/* How it works */}
        <div className="px-5 pb-10 max-w-lg mx-auto">
          <h2 className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-6">How it works</h2>
          <div className="space-y-5">
            <HowItWorksStep number="1" title="Upload Photos" description="Snap a few pictures of your junk from your phone." />
            <HowItWorksStep number="2" title="Get Your Estimate" description="We review your photos and send a fair, firm price." />
            <HowItWorksStep number="3" title="Schedule Pickup" description="Pick a time that works. We handle the rest." />
          </div>
        </div>

        {/* Trust section */}
        <div className="px-5 pb-14 max-w-lg mx-auto">
          <div className="bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-800">
            <TrustBadge icon={ShieldIcon} text="100% touchless process" />
            <TrustBadge icon={CheckCircleIcon} text="No phone calls required" />
            <TrustBadge icon={UserGroupIcon} text="Reviewed by a real person" />
            <TrustBadge icon={ClockIcon} text="Fast response time" />
            <TrustBadge icon={StarIcon} text="No obligation estimate" />
          </div>
        </div>

        {/* What we haul */}
        <div className="px-5 pb-14 max-w-lg mx-auto">
          <h2 className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-4">We haul it all</h2>
          <div className="flex flex-wrap gap-2">
            {['Furniture', 'Appliances', 'Yard Waste', 'Garage Cleanouts', 'Estate Cleanouts', 'Construction Debris', 'Electronics', 'Mattresses'].map(item => (
              <span key={item} className="bg-gray-900 text-gray-300 text-sm px-4 py-2 rounded-full border border-gray-800">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────── FORM FLOW ────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar with progress */}
      <div className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-lg mx-auto px-5 pt-4 pb-3">
          {/* Progress bar */}
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Step indicators */}
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={s.key} className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isDone ? 'bg-green-500/20 text-green-400' :
                    isActive ? 'bg-green-500 text-gray-950 shadow-lg shadow-green-500/30' :
                    'bg-gray-800 text-gray-600'
                  }`}>
                    {isDone ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold transition-colors ${
                    isActive ? 'text-white' : isDone ? 'text-green-400' : 'text-gray-600'
                  }`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form content */}
      <div className="max-w-lg mx-auto px-5 py-8">
        {/* Step header */}
        <div className="mb-6">
          <h2 className="text-2xl font-black text-white">{STEPS[step].description}</h2>
          <p className="text-gray-500 text-sm mt-1">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>

        {/* ──── Step 0: Contact ──── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FloatingInput label="First name" value={form.firstName} onChange={v => update('firstName', v)} autoFocus />
              <FloatingInput label="Last name" value={form.lastName} onChange={v => update('lastName', v)} />
            </div>
            <FloatingInput label="Phone number" type="tel" value={form.phone} onChange={v => update('phone', v)} placeholder="(555) 555-5555" />
            <FloatingInput label="Email (optional)" type="email" value={form.email} onChange={v => update('email', v)} placeholder="you@example.com" />
            <InlineTrust text="We'll only use this to send your estimate" />
          </div>
        )}

        {/* ──── Step 1: Address ──── */}
        {step === 1 && (
          <div className="space-y-4">
            <FloatingInput label="Street address" value={form.address} onChange={v => update('address', v)} autoFocus placeholder="123 Main St" />
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3">
                <FloatingInput label="City" value={form.city} onChange={v => update('city', v)} />
              </div>
              <FloatingInput label="State" value={form.state} onChange={v => update('state', v)} placeholder="GA" />
              <FloatingInput label="ZIP" value={form.zip} onChange={v => update('zip', v)} placeholder="30301" />
            </div>
            <InlineTrust text="We need this to check if we service your area" />
          </div>
        )}

        {/* ──── Step 2: Photos ──── */}
        {step === 2 && (
          <div className="space-y-4">
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
                className="w-full border-2 border-dashed border-gray-700 hover:border-green-500/50 rounded-2xl p-8 text-center transition-all hover:bg-green-500/5 group"
              >
                <div className="w-14 h-14 bg-gray-800 group-hover:bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors">
                  <CameraIcon className="w-7 h-7 text-gray-500 group-hover:text-green-400 transition-colors" />
                </div>
                <span className="text-white font-bold text-base block">
                  Tap to add photos
                </span>
                <span className="text-gray-500 text-sm mt-1 block">
                  {form.photos.length === 0
                    ? 'Upload at least 3 photos of your items'
                    : `${form.photos.length}/10 photos (${Math.max(0, 3 - form.photos.length)} more required)`
                  }
                </span>
              </button>
            )}

            {form.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.photos.map((photo, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 ring-1 ring-gray-700">
                    <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-500/80 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {form.photos.length < 10 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center hover:border-green-500/50 transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {form.photos.length >= 3 && !aiItems && (
              <button
                onClick={analyzePhotos}
                disabled={analyzing}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white py-4 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors border border-gray-700 flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Identifying items...
                  </>
                ) : (
                  <>
                    <SparkleIcon className="w-5 h-5 text-green-400" />
                    Auto-detect items from photos
                  </>
                )}
              </button>
            )}

            {aiItems && aiItems.length > 0 && (
              <div className="bg-gray-900 rounded-2xl p-4 space-y-2 border border-gray-800">
                <div className="flex items-center gap-2 mb-3">
                  <SparkleIcon className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-bold text-white">Items detected - confirm or edit:</span>
                </div>
                {aiItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-800 rounded-xl p-2.5">
                    <input
                      type="text"
                      value={item.item}
                      onChange={e => updateDetectedItem(i, 'item', e.target.value)}
                      className="flex-1 text-sm bg-transparent text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateDetectedItem(i, 'quantity', Number(e.target.value))}
                      className="w-16 text-sm bg-transparent text-white border border-gray-700 rounded-lg px-2 py-2 text-center focus:outline-none focus:border-green-500"
                    />
                    <button
                      onClick={() => removeDetectedItem(i)}
                      className="text-gray-600 hover:text-red-400 p-1.5 transition-colors"
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
              <p className="text-sm text-gray-500 text-center py-2">
                Couldn't auto-detect items. No worries - just describe them in the next step.
              </p>
            )}

            <InlineTrust text="Photos help us give you an accurate, no-surprise estimate" />
          </div>
        )}

        {/* ──── Step 3: Details ──── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-wide">How much stuff?</label>
              <div className="grid grid-cols-2 gap-2">
                {QUANTITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => update('quantity', opt.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      form.quantity === opt.value
                        ? 'bg-green-500/10 border-green-500 ring-1 ring-green-500'
                        : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <span className={`text-2xl font-black block ${form.quantity === opt.value ? 'text-green-400' : 'text-gray-600'}`}>
                      {opt.icon}
                    </span>
                    <span className={`text-sm font-bold block mt-1 ${form.quantity === opt.value ? 'text-white' : 'text-gray-300'}`}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-gray-500 block">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-wide">Where are the items?</label>
              <div className="space-y-2">
                {ACCESS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => update('accessType', opt.value)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                      form.accessType === opt.value
                        ? 'bg-green-500/10 border-green-500 ring-1 ring-green-500'
                        : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className={`font-semibold text-sm ${form.accessType === opt.value ? 'text-white' : 'text-gray-300'}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-wide">Any stairs?</label>
              <div className="grid grid-cols-2 gap-2">
                {STAIRS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => update('stairs', opt.value)}
                    className={`p-3.5 rounded-xl border font-semibold text-sm transition-all ${
                      form.stairs === opt.value
                        ? 'bg-green-500/10 border-green-500 text-white ring-1 ring-green-500'
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {(form.accessType === 'upstairs' || form.accessType === 'basement') && (
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-wide">Elevator available?</label>
                <div className="grid grid-cols-2 gap-2">
                  {ELEVATOR_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => update('elevator', opt.value)}
                      className={`p-3.5 rounded-xl border font-semibold text-sm transition-all ${
                        form.elevator === opt.value
                          ? 'bg-green-500/10 border-green-500 text-white ring-1 ring-green-500'
                          : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">
                Anything else? <span className="text-gray-600 font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors resize-none"
                rows={3}
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="e.g. Old furniture from a renovation, some items are heavy..."
              />
            </div>
          </div>
        )}

        {/* ──── Step 4: Schedule ──── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-wide">Pick a day</label>
              <div className="grid grid-cols-3 gap-2">
                {availableDays.map(day => {
                  const { weekday, date } = formatDateShort(day);
                  const isSelected = form.preferredDate === day;
                  const isSecond = form.secondChoiceDate === day;
                  return (
                    <button
                      key={day}
                      onClick={() => update('preferredDate', day)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-green-500/15 border-green-500 ring-1 ring-green-500'
                          : isSecond
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <span className={`text-xs font-bold block ${isSelected ? 'text-green-400' : 'text-gray-500'}`}>
                        {weekday}
                      </span>
                      <span className={`text-sm font-semibold block mt-0.5 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                        {date}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {form.preferredDate && (
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-wide">
                  Backup day <span className="text-gray-600 font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {availableDays.filter(d => d !== form.preferredDate).slice(0, 6).map(day => {
                    const { weekday, date } = formatDateShort(day);
                    const isSelected = form.secondChoiceDate === day;
                    return (
                      <button
                        key={day}
                        onClick={() => update('secondChoiceDate', form.secondChoiceDate === day ? '' : day)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-green-500/15 border-green-500 ring-1 ring-green-500'
                            : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <span className={`text-xs font-bold block ${isSelected ? 'text-green-400' : 'text-gray-500'}`}>
                          {weekday}
                        </span>
                        <span className={`text-sm font-semibold block mt-0.5 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {date}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-wide">Preferred time</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_PREFERENCES.map(pref => (
                  <button
                    key={pref.value}
                    onClick={() => update('timePreference', pref.value)}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      form.timePreference === pref.value
                        ? 'bg-green-500/15 border-green-500 ring-1 ring-green-500'
                        : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-xl block">{pref.icon}</span>
                    <span className={`text-sm font-bold block mt-1 ${form.timePreference === pref.value ? 'text-white' : 'text-gray-300'}`}>
                      {pref.label}
                    </span>
                    <span className="text-xs text-gray-500 block">{pref.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <InlineTrust text="You'll confirm the exact time when you accept your estimate" />
          </div>
        )}

        {submitError && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400 text-center">
            {submitError}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 space-y-3 pb-8">
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              disabled={!canProceed()}
              className="w-full bg-green-500 hover:bg-green-400 text-gray-950 py-4.5 rounded-xl text-base font-extrabold shadow-lg shadow-green-500/20 disabled:opacity-30 disabled:shadow-none disabled:hover:bg-green-500 active:scale-[0.98] transform transition-all"
              style={{ paddingTop: '18px', paddingBottom: '18px' }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className="w-full bg-green-500 hover:bg-green-400 text-gray-950 py-4.5 rounded-xl text-base font-extrabold shadow-lg shadow-green-500/20 disabled:opacity-30 disabled:shadow-none disabled:hover:bg-green-500 active:scale-[0.98] transform transition-all"
              style={{ paddingTop: '18px', paddingBottom: '18px' }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Request'
              )}
            </button>
          )}

          <button
            onClick={back}
            className="w-full text-gray-500 hover:text-gray-300 py-3 text-sm font-semibold transition-colors"
          >
            {step === 0 ? 'Back to start' : 'Back'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────── COMPONENTS ────────────────────────

function FloatingInput({ label, type = 'text', value, onChange, placeholder, autoFocus }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}

function HowItWorksStep({ number, title, description }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-gray-950 font-black text-sm">{number}</span>
      </div>
      <div className="pt-1">
        <h3 className="text-white font-bold text-base">{title}</h3>
        <p className="text-gray-500 text-sm mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function TrustBadge({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-green-400 flex-shrink-0" />
      <span className="text-gray-300 text-sm">{text}</span>
    </div>
  );
}

function InlineTrust({ text }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <ShieldIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
      <span className="text-xs text-gray-600">{text}</span>
    </div>
  );
}

// ──────────────────────── ICONS ────────────────────────

function UserIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function PinIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CameraIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ClipboardIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function CalendarIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ShieldIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function CheckCircleIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UserGroupIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StarIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function SparkleIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
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

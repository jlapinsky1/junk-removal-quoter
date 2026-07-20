import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getRepo } from '../utils/repository';

function generateIdempotencyKey() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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

const COMPANION_CONTENT = [
  {
    headline: 'No phone calls required.',
    body: 'We\'ll only use your contact info to send your estimate. No spam, no sales calls.',
    trust: ['Fast response time', 'Your info stays private', 'Touchless process'],
  },
  {
    headline: 'We service your area.',
    body: 'Your address helps us calculate travel distance and check availability for your neighborhood.',
    trust: ['Local crew dispatched', 'Accurate scheduling', 'Fully insured'],
  },
  {
    headline: 'Better photos, better estimate.',
    body: 'Clear photos help us give you an accurate price upfront. No surprises on pickup day.',
    trust: ['AI-powered item detection', 'Reviewed by a real person', 'No hidden fees'],
  },
  {
    headline: 'Tell us about the job.',
    body: 'These details help us send the right size crew and truck. Every estimate is reviewed by a real person.',
    trust: ['Right crew for the job', 'No obligation estimate', 'Fair, transparent pricing'],
  },
  {
    headline: 'Pick the day that works.',
    body: 'Choose your preferred pickup time and we\'ll confirm availability after reviewing your request.',
    trust: ['Flexible scheduling', 'Easy rescheduling', 'We confirm before we come'],
  },
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
  const [step, setStep] = useState(-1);
  const [submitted, setSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiItems, setAiItems] = useState(null);
  const fileInputRef = useRef(null);

  const [sessionId, setSessionId] = useState(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState(null);

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    address: '', city: '', state: '', zip: '',
    photos: [], photoNames: [], detectedItems: [],
    description: '', quantity: '',
    accessType: 'curbside', stairs: 'none', elevator: 'no',
    preferredDate: '', secondChoiceDate: '', timePreference: 'morning',
  });

  useEffect(() => {
    const handlePopState = (e) => {
      const s = e.state?.step ?? -1;
      setStep(s);
    };
    window.addEventListener('popstate', handlePopState);
    if (!window.history.state?.hasOwnProperty('step')) {
      window.history.replaceState({ step: -1 }, '');
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const repo = await getRepo();
    const session = await repo.createUploadSession(null);
    setSessionId(session.sessionId);
    return session.sessionId;
  }, [sessionId]);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function goToStep(s) {
    setStep(s);
    window.history.pushState({ step: s }, '');
  }

  function next() {
    if (step < STEPS.length - 1) goToStep(step + 1);
  }

  function back() {
    window.history.back();
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
    if (toProcess.length === 0) return;

    setUploadingPhotos(true);
    setPhotoError(null);

    try {
      const sid = await ensureSession();
      const repo = await getRepo();

      for (const file of toProcess) {
        const preview = await resizeImage(file, 1200);
        const { signedUrl, token } = await repo.getUploadUrl(sid, file.name, file.type || 'image/jpeg');

        await fetch(signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'image/jpeg',
            ...(token ? { 'x-upsert': 'true' } : {}),
          },
          body: file,
        });

        setForm(prev => ({
          ...prev,
          photos: [...prev.photos, preview],
          photoNames: [...prev.photoNames, file.name],
        }));
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      setPhotoError(err.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhotos(false);
    }
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
        sessionId, idempotencyKey,
        customerName: `${form.firstName} ${form.lastName}`.trim(),
        customerPhone: form.phone, customerEmail: form.email,
        address: form.address, city: form.city, state: form.state, zip: form.zip,
        fullAddress: `${form.address}, ${form.city}, ${form.state} ${form.zip}`,
        photoCount: form.photos.length,
        detectedItems: form.detectedItems, aiDetectedItems: form.detectedItems,
        description: form.description, quantity: form.quantity,
        accessType: form.accessType, stairs: form.stairs, elevator: form.elevator,
        preferredDate: form.preferredDate,
        secondChoiceDate: form.secondChoiceDate || null,
        timePreference: form.timePreference,
      });
      setBookingId(result.bookingId || result.id);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const progressPercent = step < 0 ? 0 : ((step + 1) / STEPS.length) * 100;
  const availableDays = generateNextDays(14);

  // ──────────────────────── SUCCESS SCREEN ────────────────────────
  if (submitted) {
    return (
      <PageShell>
        <BrandHeader />
        <div className="lg:flex lg:min-h-[calc(100vh-65px)]">
          {/* Desktop companion */}
          <CompanionPanel>
            <div className="max-w-md">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-8 ring-1 ring-green-500/20">
                <CheckCircleIcon className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-4xl font-black text-white leading-tight mb-5 tracking-tight">
                Request received.
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-10">
                We'll review everything and send your approved estimate. Most customers hear back within a few hours.
              </p>
              <div className="space-y-4">
                <CompanionTrust text="Reviewed by a real person" />
                <CompanionTrust text="No obligation - review before you commit" />
                <CompanionTrust text="Fully insured and licensed" />
              </div>
            </div>
          </CompanionPanel>

          {/* Success content */}
          <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
            <div className="max-w-md w-full text-center">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-black text-white mb-3 tracking-tight">You're All Set!</h1>
              <p className="text-gray-400 text-lg mb-10 leading-relaxed">
                We'll review your photos and send you a firm estimate. No surprises.
              </p>

              <div className="bg-gray-900/80 rounded-2xl p-6 text-left space-y-3.5 border border-gray-800/80 shadow-lg shadow-black/20 ring-1 ring-white/[0.03]">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Preferred date</span>
                  <span className="text-white font-semibold text-sm">{formatDate(form.preferredDate)}</span>
                </div>
                {form.secondChoiceDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Second choice</span>
                    <span className="text-white font-semibold text-sm">{formatDate(form.secondChoiceDate)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Time</span>
                  <span className="text-white font-semibold text-sm">
                    {TIME_PREFERENCES.find(t => t.value === form.timePreference)?.label || form.timePreference}
                  </span>
                </div>
                <div className="border-t border-gray-800/60 pt-3.5 flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Confirmation</span>
                  <span className="text-green-400 font-mono font-bold tracking-wider text-sm">
                    #{bookingId.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="mt-10 flex flex-col gap-3 lg:hidden">
                <TrustBadge icon={CheckCircleIcon} text="A real person will review your request" />
                <TrustBadge icon={CheckCircleIcon} text="Estimate sent within a few hours" />
                <TrustBadge icon={CheckCircleIcon} text="No obligation - review before you commit" />
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // ──────────────────────── HERO LANDING ────────────────────────
  if (step === -1) {
    return (
      <PageShell>
        <BrandHeader />

        {/* ── Desktop Hero ── */}
        <div className="hidden lg:block min-h-[calc(100vh-65px)] relative overflow-hidden">
          {/* Brand-colored ambient lighting */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[15%] left-[10%] w-[400px] h-[400px] bg-green-500/[0.04] rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] right-[30%] w-[500px] h-[500px] bg-green-500/[0.025] rounded-full blur-[140px]" />
          </div>

          {/* Truck - positioned absolutely, large, anchored bottom-right, extends off-screen */}
          <div className="absolute bottom-0 right-0 w-[58%] xl:w-[55%] pointer-events-none" style={{ transform: 'translateX(5%)' }}>
            {/* Green rim glow behind the truck */}
            <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] bg-green-500/[0.06] rounded-full blur-[80px]" />
            <img
              src="/truck-hero.webp"
              alt="Professional junk pickup truck"
              className="relative w-full object-contain"
              style={{ filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.6)) drop-shadow(0 8px 20px rgba(0,0,0,0.4))' }}
            />
            {/* Ground shadow / fade */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent" />
            {/* Right edge fade so truck bleeds off naturally */}
            <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-l from-gray-950 to-transparent" />
          </div>

          {/* Left: copy + CTA */}
          <div className="relative z-10 max-w-7xl mx-auto px-14 xl:px-20 flex items-center min-h-[calc(100vh-65px)]">
            <div className="w-[45%] xl:w-[42%] py-16">
              <h1 className="text-5xl xl:text-[3.75rem] font-black leading-[1.05] tracking-tight mb-6">
                Junk Gone.<br />
                <span className="text-green-400">Fast & Easy.</span>
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-md">
                Snap a few photos, get a fair estimate, and we'll haul it all away. No phone calls. No hassle.
              </p>

              <div className="space-y-5 mb-10">
                <HowItWorksStep number="1" title="Request Your Pickup" description="Tell us what needs to go and upload photos." />
                <HowItWorksStep number="2" title="Get Your Estimate" description="We review and send a fair, firm price." />
                <HowItWorksStep number="3" title="We Haul It Away" description="Pick a time. We show up and handle everything." />
              </div>

              <button
                onClick={() => goToStep(0)}
                className="w-full max-w-sm bg-green-500 hover:bg-green-400 text-gray-950 font-extrabold text-lg py-5 rounded-2xl transition-all duration-200 btn-glow active:scale-[0.98] transform"
              >
                Get Your Free Estimate
              </button>
              <p className="text-gray-600 text-xs mt-3 font-medium tracking-wide max-w-sm text-center">Takes about 2 minutes</p>

              <div className="flex flex-wrap gap-x-6 gap-y-2.5 mt-10 pt-8 border-t border-gray-800/30">
                <CompanionTrust text="Touchless process" />
                <CompanionTrust text="Fully insured" />
                <CompanionTrust text="No hidden fees" />
                <CompanionTrust text="Reviewed by a real person" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile Hero ── */}
        <div className="lg:hidden">
          <div className="px-5 pt-10 pb-0 max-w-lg mx-auto">
            <h1 className="text-[2.75rem] font-black leading-[1.08] tracking-tight">
              Junk Gone.<br />
              <span className="text-green-400">Fast & Easy.</span>
            </h1>
            <p className="text-gray-400 text-lg mt-4 leading-relaxed">
              Snap photos. Get an estimate. We haul it all away.
            </p>
          </div>

          {/* Truck - large, bleeds right, product-style */}
          <div className="relative overflow-hidden -mr-8 pl-4 mt-2 mb-0">
            {/* Green glow underneath */}
            <div className="absolute bottom-[15%] left-1/2 -translate-x-1/4 w-[70%] h-[30%] bg-green-500/[0.05] rounded-full blur-[60px]" />
            <img
              src="/truck-hero.webp"
              alt="Professional junk pickup truck"
              className="relative w-full max-w-lg object-contain"
              style={{ filter: 'drop-shadow(0 16px 40px rgba(0,0,0,0.5))' }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-950 to-transparent" />
          </div>

          <div className="px-5 pb-10 max-w-lg mx-auto">
            <button
              onClick={() => goToStep(0)}
              className="w-full bg-green-500 hover:bg-green-400 text-gray-950 font-extrabold text-lg py-5 rounded-2xl transition-all duration-200 btn-glow active:scale-[0.98] transform"
            >
              Get Your Free Estimate
            </button>
            <p className="text-center text-gray-600 text-xs mt-3 font-medium tracking-wide">Takes about 2 minutes</p>
          </div>

          <div className="px-5 pb-10 max-w-lg mx-auto">
            <h2 className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500 mb-6">How it works</h2>
            <div className="space-y-6">
              <HowItWorksStep number="1" title="Request Your Pickup" description="Tell us what needs to go and upload photos." />
              <HowItWorksStep number="2" title="Get Your Estimate" description="We review and send a fair, firm price." />
              <HowItWorksStep number="3" title="We Haul It Away" description="Pick a time. We show up and handle everything." />
            </div>
          </div>

          <div className="px-5 pb-12 max-w-lg mx-auto">
            <div className="bg-gray-900/60 rounded-2xl p-6 space-y-4 border border-gray-800/60 ring-1 ring-white/[0.02]">
              <TrustBadge icon={ShieldIcon} text="100% touchless process" />
              <TrustBadge icon={CheckCircleIcon} text="No phone calls required" />
              <TrustBadge icon={UserGroupIcon} text="Reviewed by a real person" />
              <TrustBadge icon={ClockIcon} text="Fast response time" />
              <TrustBadge icon={StarIcon} text="No obligation estimate" />
            </div>
          </div>

          <div className="px-5 pb-14 max-w-lg mx-auto">
            <h2 className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500 mb-4">We haul it all</h2>
            <div className="flex flex-wrap gap-2">
              {['Furniture', 'Appliances', 'Yard Waste', 'Garage Cleanouts', 'Estate Cleanouts', 'Construction Debris', 'Electronics', 'Mattresses'].map(item => (
                <span key={item} className="bg-gray-900/60 text-gray-300 text-sm px-4 py-2 rounded-full border border-gray-800/60">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // ──────────────────────── FORM FLOW ────────────────────────
  const companion = COMPANION_CONTENT[step];

  return (
    <PageShell>
      <BrandHeader />

      <div className="lg:flex lg:min-h-[calc(100vh-65px)]">
        {/* Desktop companion panel */}
        <CompanionPanel>
          <div className="max-w-md relative">
            {/* Step context icon */}
            <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mb-8 ring-1 ring-green-500/20 shadow-lg shadow-green-500/5">
              {React.createElement(STEPS[step].icon, { className: 'w-7 h-7 text-green-400' })}
            </div>

            <h2 className="text-4xl font-black text-white leading-tight mb-5 tracking-tight">
              {companion.headline}
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-12">
              {companion.body}
            </p>

            {/* Contextual trust signals */}
            <div className="space-y-4 pt-8 border-t border-gray-800/40">
              {companion.trust.map(text => (
                <CompanionTrust key={text} text={text} />
              ))}
            </div>

            {/* Progress indicator on desktop */}
            <div className="mt-12 pt-8 border-t border-gray-800/40">
              <div className="flex items-center gap-2.5">
                {STEPS.map((s, i) => (
                  <div
                    key={s.key}
                    className={`h-1.5 rounded-full flex-1 transition-all duration-500 ease-out ${
                      i < step ? 'bg-green-500' :
                      i === step ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
                      'bg-gray-800/80'
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-600 text-xs mt-3 font-medium">Step {step + 1} of {STEPS.length}</p>
            </div>
          </div>
        </CompanionPanel>

        {/* Right side - form */}
        <div className="flex-1 flex flex-col relative">
          {/* Subtle background glow */}
          <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500/[0.02] rounded-full blur-[100px]" />
          </div>

          {/* Mobile-only progress bar */}
          <div className="lg:hidden sticky top-0 z-50 bg-gray-950/90 backdrop-blur-xl border-b border-gray-800/40">
            <div className="max-w-lg mx-auto px-5 pt-4 pb-3">
              <div className="h-1 bg-gray-800/80 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const isActive = i === step;
                  const isDone = i < step;
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-1.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isDone ? 'bg-green-500/15 text-green-400' :
                        isActive ? 'bg-green-500 text-gray-950 shadow-[0_0_16px_rgba(34,197,94,0.35)]' :
                        'bg-gray-800/80 text-gray-600'
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
                        isActive ? 'text-white' : isDone ? 'text-green-400/80' : 'text-gray-600'
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
          <div className="flex-1 flex flex-col justify-center relative">
            <div className="max-w-lg mx-auto w-full px-5 py-8 lg:px-10 xl:px-14 lg:py-0">
              {/* Desktop: form card surface */}
              <div className="lg:bg-gray-900/40 lg:border lg:border-gray-800/50 lg:rounded-3xl lg:p-10 lg:ring-1 lg:ring-white/[0.03] lg:shadow-2xl lg:shadow-black/20 lg:backdrop-blur-sm">
                {/* Step header */}
                <div className="mb-8">
                  <h2 className="text-[1.65rem] font-black text-white tracking-tight leading-tight">{STEPS[step].description}</h2>
                  <p className="text-gray-500 text-sm mt-1.5 lg:hidden font-medium">
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

                    {form.photos.length < 10 && !uploadingPhotos && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-700/60 hover:border-green-500/40 rounded-2xl p-8 text-center transition-all duration-200 hover:bg-green-500/[0.03] group"
                      >
                        <div className="w-14 h-14 bg-gray-800/80 group-hover:bg-green-500/15 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-green-500/10">
                          <CameraIcon className="w-7 h-7 text-gray-500 group-hover:text-green-400 transition-colors duration-200" />
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
                      <div className="grid grid-cols-3 gap-2.5">
                        {form.photos.map((photo, i) => (
                          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 ring-1 ring-white/[0.06] shadow-md shadow-black/20 group">
                            <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                            <button
                              onClick={() => removePhoto(i)}
                              className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-500/80 transition-all duration-150 opacity-0 group-hover:opacity-100 sm:opacity-100"
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
                            className="aspect-square rounded-xl border-2 border-dashed border-gray-700/50 flex items-center justify-center hover:border-green-500/40 hover:bg-green-500/[0.03] transition-all duration-200"
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
                        className="w-full bg-gray-800/80 hover:bg-gray-700/80 text-white py-4 rounded-xl font-bold text-sm disabled:opacity-50 transition-all duration-200 border border-gray-700/60 flex items-center justify-center gap-2 ring-1 ring-white/[0.03]"
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
                      <div className="bg-gray-900/60 rounded-2xl p-4 space-y-2 border border-gray-800/60 ring-1 ring-white/[0.02]">
                        <div className="flex items-center gap-2 mb-3">
                          <SparkleIcon className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-bold text-white">Items detected - confirm or edit:</span>
                        </div>
                        {aiItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 bg-gray-800/60 rounded-xl p-2.5">
                            <input
                              type="text"
                              value={item.item}
                              onChange={e => updateDetectedItem(i, 'item', e.target.value)}
                              className="flex-1 text-sm bg-transparent text-white border border-gray-700/60 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500 focus-glow transition-all"
                            />
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => updateDetectedItem(i, 'quantity', Number(e.target.value))}
                              className="w-16 text-sm bg-transparent text-white border border-gray-700/60 rounded-lg px-2 py-2 text-center focus:outline-none focus:border-green-500 focus-glow transition-all"
                            />
                            <button
                              onClick={() => removeDetectedItem(i)}
                              className="text-gray-600 hover:text-red-400 p-1.5 transition-colors duration-150"
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

                    {uploadingPhotos && (
                      <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-400">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading photos...
                      </div>
                    )}

                    {photoError && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 text-center">
                        {photoError}
                      </div>
                    )}

                    <InlineTrust text="Photos help us give you an accurate, no-surprise estimate" />
                  </div>
                )}

                {/* ──── Step 3: Details ──── */}
                {step === 3 && (
                  <div className="space-y-7">
                    <div>
                      <SectionLabel>How much stuff?</SectionLabel>
                      <div className="grid grid-cols-2 gap-2.5">
                        {QUANTITY_OPTIONS.map(opt => (
                          <OptionCard
                            key={opt.value}
                            selected={form.quantity === opt.value}
                            onClick={() => update('quantity', opt.value)}
                          >
                            <span className={`text-2xl font-black block ${form.quantity === opt.value ? 'text-green-400' : 'text-gray-600'}`}>
                              {opt.icon}
                            </span>
                            <span className={`text-sm font-bold block mt-1.5 ${form.quantity === opt.value ? 'text-white' : 'text-gray-300'}`}>
                              {opt.label}
                            </span>
                            <span className="text-xs text-gray-500 block mt-0.5">{opt.sub}</span>
                          </OptionCard>
                        ))}
                      </div>
                    </div>

                    <div>
                      <SectionLabel>Where are the items?</SectionLabel>
                      <div className="space-y-2">
                        {ACCESS_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => update('accessType', opt.value)}
                            className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                              form.accessType === opt.value
                                ? 'bg-green-500/10 border-green-500/50 ring-1 ring-green-500/40 shadow-sm shadow-green-500/5'
                                : 'bg-gray-900/50 border-gray-800/60 hover:border-gray-700 hover:bg-gray-800/40'
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
                      <SectionLabel>Any stairs?</SectionLabel>
                      <div className="grid grid-cols-2 gap-2.5">
                        {STAIRS_OPTIONS.map(opt => (
                          <OptionCard
                            key={opt.value}
                            selected={form.stairs === opt.value}
                            onClick={() => update('stairs', opt.value)}
                            compact
                          >
                            <span className={`font-semibold text-sm ${form.stairs === opt.value ? 'text-white' : 'text-gray-400'}`}>
                              {opt.label}
                            </span>
                          </OptionCard>
                        ))}
                      </div>
                    </div>

                    {(form.accessType === 'upstairs' || form.accessType === 'basement') && (
                      <div>
                        <SectionLabel>Elevator available?</SectionLabel>
                        <div className="grid grid-cols-2 gap-2.5">
                          {ELEVATOR_OPTIONS.map(opt => (
                            <OptionCard
                              key={opt.value}
                              selected={form.elevator === opt.value}
                              onClick={() => update('elevator', opt.value)}
                              compact
                            >
                              <span className={`font-semibold text-sm ${form.elevator === opt.value ? 'text-white' : 'text-gray-400'}`}>
                                {opt.label}
                              </span>
                            </OptionCard>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 mb-2.5 uppercase tracking-[0.1em]">
                        Anything else? <span className="text-gray-600 font-medium normal-case tracking-normal">(optional)</span>
                      </label>
                      <textarea
                        className="w-full bg-gray-900/60 border border-gray-800/60 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/60 focus-glow transition-all duration-200 resize-none ring-1 ring-white/[0.02]"
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
                  <div className="space-y-7">
                    <div>
                      <SectionLabel>Pick a day</SectionLabel>
                      <div className="grid grid-cols-3 gap-2.5">
                        {availableDays.map(day => {
                          const { weekday, date } = formatDateShort(day);
                          const isSelected = form.preferredDate === day;
                          const isSecond = form.secondChoiceDate === day;
                          return (
                            <button
                              key={day}
                              onClick={() => update('preferredDate', day)}
                              className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                                isSelected
                                  ? 'bg-green-500/10 border-green-500/50 ring-1 ring-green-500/40 shadow-sm shadow-green-500/5'
                                  : isSecond
                                  ? 'bg-gray-800/60 border-gray-600/60'
                                  : 'bg-gray-900/50 border-gray-800/60 hover:border-gray-700 hover:bg-gray-800/40'
                              }`}
                            >
                              <span className={`text-[10px] font-bold block tracking-wide ${isSelected ? 'text-green-400' : 'text-gray-500'}`}>
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
                        <label className="block text-[11px] font-bold text-gray-400 mb-3 uppercase tracking-[0.1em]">
                          Backup day <span className="text-gray-600 font-medium normal-case tracking-normal">(optional)</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {availableDays.filter(d => d !== form.preferredDate).slice(0, 6).map(day => {
                            const { weekday, date } = formatDateShort(day);
                            const isSelected = form.secondChoiceDate === day;
                            return (
                              <button
                                key={day}
                                onClick={() => update('secondChoiceDate', form.secondChoiceDate === day ? '' : day)}
                                className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-green-500/10 border-green-500/50 ring-1 ring-green-500/40 shadow-sm shadow-green-500/5'
                                    : 'bg-gray-900/50 border-gray-800/60 hover:border-gray-700 hover:bg-gray-800/40'
                                }`}
                              >
                                <span className={`text-[10px] font-bold block tracking-wide ${isSelected ? 'text-green-400' : 'text-gray-500'}`}>
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
                      <SectionLabel>Preferred time</SectionLabel>
                      <div className="grid grid-cols-3 gap-2.5">
                        {TIME_PREFERENCES.map(pref => (
                          <OptionCard
                            key={pref.value}
                            selected={form.timePreference === pref.value}
                            onClick={() => update('timePreference', pref.value)}
                            className="text-center"
                          >
                            <span className="text-xl block">{pref.icon}</span>
                            <span className={`text-sm font-bold block mt-1.5 ${form.timePreference === pref.value ? 'text-white' : 'text-gray-300'}`}>
                              {pref.label}
                            </span>
                            <span className="text-xs text-gray-500 block mt-0.5">{pref.sub}</span>
                          </OptionCard>
                        ))}
                      </div>
                    </div>

                    <InlineTrust text="You'll confirm the exact time when you accept your estimate" />
                  </div>
                )}

                {submitError && (
                  <div className="mt-5 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400 text-center">
                    {submitError}
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-10 space-y-3 pb-8 lg:pb-0">
                  {step < STEPS.length - 1 ? (
                    <button
                      onClick={next}
                      disabled={!canProceed()}
                      className="w-full bg-green-500 hover:bg-green-400 text-gray-950 rounded-xl text-base font-extrabold btn-glow disabled:opacity-30 disabled:shadow-none disabled:hover:bg-green-500 active:scale-[0.98] transform transition-all duration-200"
                      style={{ paddingTop: '18px', paddingBottom: '18px' }}
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={!canProceed() || submitting}
                      className="w-full bg-green-500 hover:bg-green-400 text-gray-950 rounded-xl text-base font-extrabold btn-glow disabled:opacity-30 disabled:shadow-none disabled:hover:bg-green-500 active:scale-[0.98] transform transition-all duration-200"
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
                    className="w-full text-gray-500 hover:text-gray-300 py-3 text-sm font-semibold transition-colors duration-200"
                  >
                    {step === 0 ? 'Back to start' : 'Back'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ──────────────────────── LAYOUT COMPONENTS ────────────────────────

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white bg-noise">
      {children}
    </div>
  );
}

function BrandHeader() {
  return (
    <header className="bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/40 sticky top-0 z-40 lg:relative">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 h-[65px] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/20">
            <TruckIcon className="w-5.5 h-5.5 text-gray-950" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black text-[17px] leading-tight tracking-tight">Junk Pickup</span>
            <span className="text-gray-500 text-[10px] font-bold tracking-[0.15em] uppercase leading-tight">We Haul It All</span>
          </div>
        </div>
        <a
          href="tel:+15555555555"
          className="text-gray-500 hover:text-gray-300 text-xs font-semibold transition-colors duration-200 hidden sm:flex items-center gap-1.5"
        >
          <PhoneIcon className="w-3.5 h-3.5" />
          Need help?
        </a>
      </div>
    </header>
  );
}

function CompanionPanel({ children }) {
  return (
    <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] border-r border-gray-800/30 flex-col justify-center px-14 xl:px-18 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, rgba(17,24,39,0.95) 0%, rgba(3,7,18,1) 50%, rgba(17,24,39,0.9) 100%)' }}
    >
      {/* Ambient light orbs */}
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-green-500/[0.04] rounded-full blur-[100px] translate-x-1/3" />
      <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-green-500/[0.03] rounded-full blur-[80px] -translate-x-1/3" />
      <div className="absolute top-0 left-1/2 w-full h-px bg-gradient-to-r from-transparent via-gray-800/50 to-transparent" />

      <div className="relative">
        {children}
      </div>
    </div>
  );
}

function CompanionTrust({ text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 ring-1 ring-green-500/20">
        <svg className="w-2.5 h-2.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-gray-400 text-sm">{text}</span>
    </div>
  );
}

// ──────────────────────── FORM COMPONENTS ────────────────────────

function FloatingInput({ label, type = 'text', value, onChange, placeholder, autoFocus }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-[0.1em]">{label}</label>
      <input
        type={type}
        className="w-full bg-gray-900/60 border border-gray-800/60 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/60 focus-glow transition-all duration-200 ring-1 ring-white/[0.02]"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <label className="block text-[11px] font-bold text-gray-400 mb-3 uppercase tracking-[0.1em]">
      {children}
    </label>
  );
}

function OptionCard({ selected, onClick, children, compact, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`${compact ? 'p-3.5' : 'p-4'} rounded-xl border text-left transition-all duration-200 ${
        selected
          ? 'bg-green-500/10 border-green-500/50 ring-1 ring-green-500/40 shadow-sm shadow-green-500/5'
          : 'bg-gray-900/50 border-gray-800/60 hover:border-gray-700 hover:bg-gray-800/40'
      } ${className}`}
    >
      {children}
    </button>
  );
}

function HowItWorksStep({ number, title, description }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-green-500/20">
        <span className="text-gray-950 font-black text-sm">{number}</span>
      </div>
      <div className="pt-1">
        <h3 className="text-white font-bold text-[15px]">{title}</h3>
        <p className="text-gray-500 text-sm mt-0.5 leading-relaxed">{description}</p>
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
    <div className="flex items-center gap-2 pt-3">
      <ShieldIcon className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
      <span className="text-[11px] text-gray-600 font-medium">{text}</span>
    </div>
  );
}

// ──────────────────────── ICONS ────────────────────────

function TruckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );
}

function PhoneIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

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

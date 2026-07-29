import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Trash2, Mail, Lock, User, Phone, Building2, Briefcase,
  MapPin, AlertTriangle, CheckCircle, ArrowLeft, ArrowRight, ClipboardList,
} from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { trackEvent } from "../utils/analytics";

const PROPERTY_TYPES = [
  { value: "apartment_multifamily", label: "Apartment / Multifamily" },
  { value: "single_family", label: "Single-Family Rental" },
  { value: "commercial_retail", label: "Commercial / Retail" },
  { value: "hoa_community", label: "HOA / Community" },
  { value: "other", label: "Other" },
];

const SERVICE_TYPES = [
  "Apartment / Unit Cleanout",
  "Eviction Cleanup",
  "Unit Turnover Cleanout",
  "Bulk Trash Removal",
  "Dumpster Overflow Cleanup",
  "Illegal Dumping Removal",
  "Furniture Removal",
  "Appliance Removal",
  "General Junk Removal",
  "Other — describe in notes",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

function ProgressBar({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {[1, 2, 3, 4, 5].map((n) => (
        <React.Fragment key={n}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            n < step
              ? "bg-[#22c55e] text-black"
              : n === step
              ? "bg-[#22c55e]/20 border-2 border-[#22c55e] text-[#22c55e]"
              : "bg-white/5 border border-white/10 text-white/30"
          }`}>
            {n < step ? <CheckCircle className="w-4 h-4" /> : n}
          </div>
          {n < 5 && (
            <div className={`h-px flex-1 max-w-8 transition-colors ${n < step ? "bg-[#22c55e]" : "bg-white/10"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function FieldWrap({ label, required, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs text-white/50 font-medium uppercase tracking-wider">
        {label}{required && <span className="text-[#22c55e] ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function InputRow({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-3 bg-[#111a14] border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#22c55e]/40 transition-colors">
      {Icon && <Icon className="w-4 h-4 text-[#22c55e] shrink-0" />}
      {children}
    </div>
  );
}

const inputCls = "w-full bg-transparent text-sm text-white placeholder:text-white/25 outline-none";
const selectCls = "w-full bg-transparent text-sm text-white outline-none [&>option]:bg-[#111a14]";

async function loadClientRecord(supabaseClient, userId) {
  const { data } = await supabaseClient
    .from("commercial_clients")
    .select("id, last_onboarding_step, onboarding_status")
    .eq("user_id", userId)
    .single();
  return data;
}

export default function PortalStart() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [session, setSession] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [propertyId, setPropertyId] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false); // idempotency guard for Step 4

  // Capture attribution once on mount — landing_page is the wizard URL itself,
  // referrer is where the user came from.
  const [attribution] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get("utm_source") || "",
      utm_medium: p.get("utm_medium") || "",
      utm_campaign: p.get("utm_campaign") || "",
      utm_term: p.get("utm_term") || "",
      utm_content: p.get("utm_content") || "",
      referrer: document.referrer || "",
      landing_page: window.location.href,
    };
  });

  // Step 1 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  // Step 2 fields
  const [propName, setPropName] = useState("");
  const [propStreet, setPropStreet] = useState("");
  const [propCity, setPropCity] = useState("");
  const [propState, setPropState] = useState("GA");
  const [propZip, setPropZip] = useState("");
  const [propType, setPropType] = useState("");
  const [propUnits, setPropUnits] = useState("");
  const [propContactName, setPropContactName] = useState("");
  const [propContactPhone, setPropContactPhone] = useState("");
  const [propNotes, setPropNotes] = useState("");

  // Step 3 fields
  const [jobUnit, setJobUnit] = useState("");
  const [jobService, setJobService] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobDate, setJobDate] = useState("");
  const [jobAccessNotes, setJobAccessNotes] = useState("");
  const [jobPoRef, setJobPoRef] = useState("");

  // ── Auth: detect existing session or magic-link callback ─────────────────
  useEffect(() => {
    if (!supabase) return;

    async function resume(s) {
      setSession(s);
      if (s.user?.email) setEmail(s.user.email);
      const client = await loadClientRecord(supabase, s.user.id);
      if (!client) return;
      setClientId(client.id);
      if (client.onboarding_status === "complete") {
        navigate("/portal");
        return;
      }
      const resumeStep = Math.max(2, Math.min(client.last_onboarding_step, 4));
      setStep(resumeStep);
    }

    // Check for an existing session first (page refresh, returning user)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) resume(s);
    });

    // Listen for magic-link authentication callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && s) {
        resume(s);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function clearError() {
    setError("");
  }

  // ── Step 1: Create account ────────────────────────────────────────────────
  async function handleStep1(e) {
    e.preventDefault();
    if (!supabase) { setError("Supabase is not configured."); return; }
    setLoading(true);
    clearError();

    try {
      const res = await fetch("/.netlify/functions/start-commercial-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone, company, jobTitle, attribution }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError("An account with this email already exists.");
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
        return;
      }

      // Sign in with the credentials the user just entered
      const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) {
        setError("Account created but sign-in failed. Please log in.");
        return;
      }

      setSession(authData.session);
      trackEvent("commercial_profile_created");

      // Fetch client record (trigger may need a moment)
      await new Promise((r) => setTimeout(r, 600));
      const client = await loadClientRecord(supabase, authData.session.user.id);
      if (client) setClientId(client.id);

      setStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Add property ──────────────────────────────────────────────────
  async function handleStep2(e) {
    e.preventDefault();
    if (!supabase || !session || !clientId) { setError("Session expired. Please refresh."); return; }
    setLoading(true);
    clearError();

    try {
      const address = `${propStreet}, ${propCity}, ${propState} ${propZip}`;
      const { data: prop, error: propErr } = await supabase
        .from("properties")
        .insert({
          client_id: clientId,
          name: propName,
          address,
          primary_contact_name: propContactName || null,
          primary_contact_phone: propContactPhone || null,
          notes: [
            propType ? `Type: ${propType}` : null,
            propUnits ? `Units: ${propUnits}` : null,
            propNotes || null,
          ].filter(Boolean).join("\n") || null,
        })
        .select("id")
        .single();

      if (propErr) {
        setError("Failed to save property. Please try again.");
        return;
      }
      setPropertyId(prop.id);

      await supabase
        .from("commercial_clients")
        .update({ last_onboarding_step: 3 })
        .eq("id", clientId);

      trackEvent("commercial_property_added");
      setStep(3);
    } catch {
      setError("Failed to save property. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: Create draft work order ───────────────────────────────────────
  async function handleStep3(e) {
    e.preventDefault();
    if (!session || !propertyId) { setError("Session expired. Please refresh."); return; }
    setLoading(true);
    clearError();

    try {
      const desc = [jobService, jobDescription].filter(Boolean).join(" — ");
      const res = await fetch("/.netlify/functions/create-commercial-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          propertyId,
          unit: jobUnit || null,
          description: desc,
          preferredDate: jobDate || null,
          accessNotes: [jobAccessNotes, jobPoRef ? `PO/Ref: ${jobPoRef}` : null].filter(Boolean).join("\n") || null,
          photoPaths: [],
          draft: true, // saves progress without notifying admins
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create work order.");
        return;
      }
      setJobId(data.jobId);

      await supabase
        .from("commercial_clients")
        .update({ last_onboarding_step: 4 })
        .eq("id", clientId);

      trackEvent("commercial_work_order_draft_created");
      setStep(4);
    } catch {
      setError("Failed to create work order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 4: Review & final submit ─────────────────────────────────────────
  async function handleStep4() {
    if (submitted) return; // prevent double-submit
    if (!session || !propertyId || !jobId) { setError("Session expired. Please refresh."); return; }
    setLoading(true);
    setSubmitted(true);
    clearError();

    try {
      const res = await fetch("/.netlify/functions/complete-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ propertyId, jobId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitted(false);
        setError(data.error || "Failed to submit. Please try again.");
        return;
      }

      trackEvent("commercial_work_order_submitted");
      trackEvent("commercial_onboarding_completed");
      setStep(5);
      setTimeout(() => navigate("/portal"), 2500);
    } catch {
      setSubmitted(false);
      setError("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const propAddress = [propStreet, propCity, propState, propZip].filter(Boolean).join(", ");
  const jobDesc = [jobService, jobDescription].filter(Boolean).join(" — ");

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white">
      {/* Minimal nav — no main nav links to keep focus on the funnel */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0f0d]/90 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/commercial" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-[#0a0f0d]" />
            </div>
            <div className="leading-none">
              <span className="text-white font-black tracking-widest text-xs uppercase">Squatterz</span>
              <div className="text-[#22c55e] text-[8px] tracking-[0.2em] font-semibold uppercase mt-0.5">Commercial</div>
            </div>
          </Link>
          {step < 5 && (
            <Link to="/portal/login" className="text-xs text-white/40 hover:text-white/60 transition-colors">
              Already have an account? Log in
            </Link>
          )}
        </div>
      </header>

      <main className="pt-24 pb-16 px-5">
        <div className="max-w-lg mx-auto">
          {step < 5 && (
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black mb-1">
                {step === 1 && "Create Your Commercial Account"}
                {step === 2 && "Add Your First Property"}
                {step === 3 && "Create a Work Order"}
                {step === 4 && "Review and Submit"}
              </h1>
              <p className="text-white/45 text-sm">
                {step === 1 && "Takes about 2 minutes."}
                {step === 2 && "You can add more properties at any time."}
                {step === 3 && "Describe the cleanup needed."}
                {step === 4 && "Confirm your details and submit for review."}
              </p>
            </div>
          )}

          <ProgressBar step={step} />

          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 mb-6 text-sm text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span>{error}</span>
                {error.includes("already exists") && (
                  <div className="mt-2">
                    <Link to="/portal/login" className="text-[#22c55e] font-semibold hover:underline">
                      Log in instead →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Step 1 ─── */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 space-y-5">
              <FieldWrap label="Full Name" required>
                <InputRow icon={User}>
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Rivera" className={inputCls} />
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Work Email" required>
                <InputRow icon={Mail}>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@propertyco.com" autoComplete="email" className={inputCls} />
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Password" required>
                <InputRow icon={Lock}>
                  <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" minLength={8} autoComplete="new-password" className={inputCls} />
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Phone" required>
                <InputRow icon={Phone}>
                  <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(770) 555-0100" className={inputCls} />
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Company / Organization" required>
                <InputRow icon={Building2}>
                  <input required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Apex Property Management" className={inputCls} />
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Job Title">
                <InputRow icon={Briefcase}>
                  <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Property Manager (optional)" className={inputCls} />
                </InputRow>
              </FieldWrap>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? "Creating account…" : <>Create Account <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* ─── Step 2 ─── */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 space-y-5">
              <FieldWrap label="Property Name" required>
                <InputRow icon={Building2}>
                  <input required value={propName} onChange={(e) => setPropName(e.target.value)} placeholder="Oakwood Ridge Apartments" className={inputCls} />
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Street Address" required>
                <InputRow icon={MapPin}>
                  <input required value={propStreet} onChange={(e) => setPropStreet(e.target.value)} placeholder="1240 Ridge Blvd" className={inputCls} />
                </InputRow>
              </FieldWrap>

              <div className="grid grid-cols-2 gap-4">
                <FieldWrap label="City" required>
                  <InputRow>
                    <input required value={propCity} onChange={(e) => setPropCity(e.target.value)} placeholder="Gainesville" className={inputCls} />
                  </InputRow>
                </FieldWrap>
                <FieldWrap label="State" required>
                  <InputRow>
                    <select value={propState} onChange={(e) => setPropState(e.target.value)} className={selectCls}>
                      {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </InputRow>
                </FieldWrap>
              </div>

              <FieldWrap label="ZIP Code" required>
                <InputRow>
                  <input required value={propZip} onChange={(e) => setPropZip(e.target.value)} placeholder="30501" maxLength={10} className={inputCls} />
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Property Type" required>
                <InputRow>
                  <select required value={propType} onChange={(e) => setPropType(e.target.value)} className={selectCls}>
                    <option value="" disabled>Select type…</option>
                    {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Approx. Unit Count">
                <InputRow>
                  <input type="number" min="1" value={propUnits} onChange={(e) => setPropUnits(e.target.value)} placeholder="48 (optional)" className={inputCls} />
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Onsite Contact Name">
                <InputRow icon={User}>
                  <input value={propContactName} onChange={(e) => setPropContactName(e.target.value)} placeholder="Alex Smith (optional)" className={inputCls} />
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Onsite Contact Phone">
                <InputRow icon={Phone}>
                  <input type="tel" value={propContactPhone} onChange={(e) => setPropContactPhone(e.target.value)} placeholder="(770) 555-0200 (optional)" className={inputCls} />
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Access Information / Notes">
                <textarea
                  value={propNotes}
                  onChange={(e) => setPropNotes(e.target.value)}
                  rows={3}
                  placeholder="Gate code, lockbox location, parking notes… (optional)"
                  className="w-full bg-[#111a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#22c55e]/40 transition-colors resize-none"
                />
              </FieldWrap>

              <div className="flex gap-3">
                <button type="button" onClick={() => { clearError(); setStep(1); }} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? "Saving property…" : <>Save Property <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </form>
          )}

          {/* ─── Step 3 ─── */}
          {step === 3 && (
            <form onSubmit={handleStep3} className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 space-y-5">
              <FieldWrap label="Unit or Location">
                <InputRow>
                  <input value={jobUnit} onChange={(e) => setJobUnit(e.target.value)} placeholder="Unit 14B, Dumpster Area, Lot C… (optional)" className={inputCls} />
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Service Needed" required>
                <InputRow icon={ClipboardList}>
                  <select required value={jobService} onChange={(e) => setJobService(e.target.value)} className={selectCls}>
                    <option value="" disabled>Select service…</option>
                    {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Description" required>
                <textarea
                  required
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe what needs to go. Include specific items, volumes, or conditions that might affect the job."
                  className="w-full bg-[#111a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#22c55e]/40 transition-colors resize-none"
                />
              </FieldWrap>

              <FieldWrap label="Preferred Date">
                <InputRow>
                  <input type="date" value={jobDate} onChange={(e) => setJobDate(e.target.value)} className={inputCls} min={new Date().toISOString().split("T")[0]} />
                </InputRow>
              </FieldWrap>

              <FieldWrap label="Access Notes">
                <textarea
                  value={jobAccessNotes}
                  onChange={(e) => setJobAccessNotes(e.target.value)}
                  rows={2}
                  placeholder="Lockbox code, gate code, who to contact on arrival… (optional)"
                  className="w-full bg-[#111a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#22c55e]/40 transition-colors resize-none"
                />
              </FieldWrap>

              <FieldWrap label="PO / Internal Reference">
                <InputRow>
                  <input value={jobPoRef} onChange={(e) => setJobPoRef(e.target.value)} placeholder="PO-1042 or Work Order #8814 (optional)" className={inputCls} />
                </InputRow>
              </FieldWrap>

              <div className="flex gap-3">
                <button type="button" onClick={() => { clearError(); setStep(2); }} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? "Saving…" : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </form>
          )}

          {/* ─── Step 4 ─── */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 space-y-3">
                <h2 className="font-black text-lg mb-4">Review Your Submission</h2>

                {[
                  ["Company", company || session?.user?.email],
                  ["Contact", name],
                  ["Email", email || session?.user?.email],
                  ["Property", propName],
                  propAddress && ["Address", propAddress],
                  jobUnit && ["Unit / Location", jobUnit],
                  ["Service", jobService],
                ].filter(Boolean).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-2 border-b border-white/8 text-sm">
                    <span className="text-white/40">{label}</span>
                    <span className="text-white text-right">{value}</span>
                  </div>
                ))}

                {jobDescription && (
                  <div className="pt-2 text-sm">
                    <span className="text-white/40 block mb-1">Description</span>
                    <span className="text-white leading-relaxed">{jobDescription}</span>
                  </div>
                )}
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-xs text-white/35 leading-relaxed">
                Submitting will send your work order for review. We'll reach out to confirm scheduling. A confirmation will be sent to <strong className="text-white/50">{email || session?.user?.email}</strong>.
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { clearError(); setStep(3); }}
                  disabled={loading || submitted}
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleStep4}
                  disabled={loading || submitted}
                  className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? "Submitting…" : "Submit Work Order for Review"}
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 5 ─── */}
          {step === 5 && (
            <div className="text-center space-y-6 py-8">
              <div className="w-16 h-16 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-[#22c55e]" />
              </div>
              <div>
                <h2 className="text-2xl font-black mb-3">Work Order Submitted</h2>
                <p className="text-white/55 text-sm leading-relaxed max-w-sm mx-auto">
                  Your work order has been submitted for review. We'll reach out to confirm scheduling. Check your email for a confirmation.
                </p>
              </div>
              <div className="text-sm text-white/35">
                Redirecting you to the portal…
              </div>
              <button
                onClick={() => navigate("/portal")}
                className="text-sm text-[#22c55e] font-semibold hover:underline"
              >
                Go to portal now →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

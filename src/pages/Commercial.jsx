import React, { useState } from "react";
import {
  Phone,
  Star,
  Camera,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  MapPin,
  Building2,
  ClipboardList,
  FileCheck,
  Trash2,
  CalendarClock,
  Users,
  Receipt,
  FileText,
  Package,
  AlertTriangle,
  Sofa,
  Warehouse,
  SprayCan,
  Boxes,
  Recycle,
  CalendarDays,
  Trash,
  Mail,
  User,
} from "lucide-react";

const TRUST_BAR = [
  { icon: Camera, label: "Before-and-after photos" },
  { icon: FileText, label: "Clear written estimates" },
  { icon: Receipt, label: "Property and unit-specific invoices" },
  { icon: CalendarClock, label: "On-call and scheduled service" },
  { icon: Shield, label: "Insured crew and COI available" },
];

const SERVICES = [
  { icon: Boxes, title: "Tenant move-out cleanouts", desc: "Full unit turnovers handled end-to-end so your next move-in stays on schedule." },
  { icon: AlertTriangle, title: "Eviction and abandoned-property cleanouts", desc: "We clear what's left behind quickly and document everything for your records." },
  { icon: Sofa, title: "Furniture and appliance removal", desc: "Old couches, mattresses, refrigerators, and stoves hauled from any unit or common area." },
  { icon: Warehouse, title: "Garage and storage-area cleanouts", desc: "Reclaim cluttered garages, storage rooms, and mechanical closets in a single visit." },
  { icon: Trash2, title: "Illegal dumping removal", desc: "Dumped furniture and debris removed from lots, alleys, and behind dumpsters." },
  { icon: Package, title: "Common-area bulk-item pickups", desc: "Coordinated bulk removal across hallways, clubhouses, and breezeways." },
  { icon: SprayCan, title: "Renovation and maintenance debris", desc: "Construction waste, flooring, drywall, and cabinetry hauled off cleanly." },
  { icon: CalendarDays, title: "Recurring weekly or monthly pickups", desc: "Set a cadence and we'll be there — no need to call each time." },
  { icon: Users, title: "Community cleanup days", desc: "On-site crew and trucks for resident cleanup events and property-wide sweeps." },
  { icon: Trash, title: "Dumpster-area overflow cleanup", desc: "Overfilled enclosures cleared and reset before they become a code issue." },
];

const STEPS = [
  {
    num: "1",
    icon: ClipboardList,
    title: "Send the work order",
    desc: "Provide the property address, unit number, access instructions, photos, deadline, and any spending limit.",
  },
  {
    num: "2",
    icon: FileCheck,
    title: "Approve the estimate",
    desc: "You receive a clear estimate before work begins. Anything outside the approved scope requires authorization.",
  },
  {
    num: "3",
    icon: Trash2,
    title: "We complete the removal",
    desc: "Your team does not have to remain on-site, provided access has been arranged.",
  },
  {
    num: "4",
    icon: Camera,
    title: "Receive the completion packet",
    desc: "Squatterz sends before-and-after photos, completion notes, and an invoice labeled with the property and unit.",
  },
];

const DOC_ITEMS = [
  "Before photos",
  "After photos",
  "Date and time completed",
  "Property name and unit number",
  "Items or volume removed",
  "Additional issues noticed",
  "Itemized invoice",
  "Disposal receipt when requested",
];

const ACCOUNT_BENEFITS = [
  { icon: User, title: "One point of contact", desc: "No wondering who to call for the next property. Your account manager knows your portfolio." },
  { icon: Building2, title: "Portfolio support", desc: "Service for one building or multiple addresses — coordinated under one account." },
  { icon: CalendarClock, title: "Flexible scheduling", desc: "On-call work, turnover scheduling, or recurring pickup days — whatever your operations need." },
  { icon: Receipt, title: "Consistent invoicing", desc: "Invoices organized by property, unit, purchase order, or internal reference number." },
  { icon: FileText, title: "Vendor onboarding", desc: "COI, W-9, and other required onboarding documents available on request." },
];

const FAQS = [
  { q: "Can you work without a manager present?", a: "Yes. As long as access has been arranged — keys, gate codes, or lockbox — our crew can complete the removal and document everything without anyone on-site." },
  { q: "How quickly can you complete a turnover?", a: "Most single-unit turnovers are completed same-day or next-day depending on volume. For urgent evictions or move-outs, we offer on-call dispatch." },
  { q: "Do you provide before-and-after photos?", a: "Always. Every completion packet includes dated before-and-after photos plus written completion notes." },
  { q: "Can invoices include a property, unit, or purchase-order number?", a: "Yes. We label every invoice with the property name, unit number, and any internal reference or PO you provide." },
  { q: "Do you offer recurring pickups?", a: "We do. Set a weekly, biweekly, or monthly cadence and we'll show up on schedule — no need to call each time." },
  { q: "Can you service multiple properties?", a: "Yes. We coordinate service across your entire portfolio under one account and one point of contact." },
  { q: "Are you insured?", a: "Yes, our crew is fully insured. We can provide a Certificate of Insurance and list the management company or property as additional insured when required." },
  { q: "How do you handle keys, gate codes, and lockboxes?", a: "We follow your access instructions exactly. Keys, gate codes, lockbox combos, and on-site contact info are all handled per your protocol." },
  { q: "What materials can't you accept?", a: "We can't take hazardous materials, paint, chemicals, asbestos, or biohazards. If you're unsure, send photos and we'll confirm before scheduling." },
  { q: "What happens if the load is larger than estimated?", a: "We stop and request authorization before exceeding the approved scope. No surprise charges — ever." },
  { q: "Can you provide disposal or weight receipts?", a: "Yes. Disposal and weight receipts are available on request and included in the completion packet when required." },
];

const BEFORE_AFTERS = [
  {
    title: "Two-bedroom turnover cleanout",
    desc: "Furniture, mattresses, household trash and patio debris removed. Before-and-after documentation delivered to the manager.",
    before: "https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2",
    after: "https://images.pexels.com/photos/6585757/pexels-photo-6585757.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2",
  },
  {
    title: "Eviction cleanout — 1 bedroom",
    desc: "Abandoned belongings, appliances, and debris cleared within 24 hours of notice. Photos and completion notes sent same-day.",
    before: "https://images.pexels.com/photos/4245826/pexels-photo-4245826.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2",
    after: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2",
  },
];

function StarRow({ count = 5 }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-[#22c55e] text-[#22c55e]" />
      ))}
    </span>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-white font-semibold text-base group-hover:text-[#22c55e] transition-colors">
          {q}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-[#22c55e] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ${
          open ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-white/55 leading-relaxed max-w-2xl">{a}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block space-y-2">
      <span className="block text-xs text-white/50 font-medium uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-start gap-3 bg-[#111a14] border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#22c55e]/40 transition-colors">
        <Icon className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
        {children}
      </div>
    </label>
  );
}

export default function Commercial() {
  const [form, setForm] = useState({ name: "", property: "", email: "", phone: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white font-sans antialiased">
      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0f0d]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-[#0a0f0d]" />
            </div>
            <div className="leading-none">
              <span className="text-white font-black tracking-widest text-sm uppercase">
                Squatterz
              </span>
              <div className="text-[#22c55e] text-[9px] tracking-[0.2em] font-semibold uppercase mt-0.5">
                Commercial
              </div>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-sm text-white/60 hover:text-white transition-colors">Services</a>
            <a href="#process" className="text-sm text-white/60 hover:text-white transition-colors">How It Works</a>
            <a href="#account" className="text-sm text-white/60 hover:text-white transition-colors">Commercial Account</a>
            <a href="#faq" className="text-sm text-white/60 hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-5">
            <a
              href="tel:8135550123"
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              <Phone className="w-4 h-4 text-[#22c55e]" />
              <span className="font-medium">(813) 555-0123</span>
            </a>
            <a
              href="#account-setup"
              className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-sm px-5 py-2.5 rounded-full transition-colors"
            >
              Set Up Account
            </a>
          </div>

          <a href="#account-setup" className="md:hidden bg-[#22c55e] text-black font-bold text-xs px-4 py-2 rounded-full">
            Set Up
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#22c55e]/8 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-5 py-20 md:py-28">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
              <Building2 className="w-4 h-4 text-[#22c55e]" />
              <span className="text-white/80 font-medium">For Property Managers & Commercial Accounts</span>
            </div>

            <div>
              <h1 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight text-white">
                Junk Removal for
              </h1>
              <h1 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight text-[#22c55e]">
                Property Managers
              </h1>
              <p className="mt-6 text-xl md:text-2xl font-semibold text-white/80">
                Fast cleanouts. Clear documentation. One reliable crew.
              </p>
              <p className="mt-4 text-base text-white/55 leading-relaxed max-w-2xl">
                Squatterz handles tenant move-outs, abandoned belongings, bulk-item pickups, property cleanups, and recurring removal services for apartments and rental properties.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#account-setup"
                className="bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.98] text-black font-bold text-base px-8 py-4 rounded-full flex items-center justify-center gap-2 transition-all"
              >
                Request Property Service <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#account"
                className="border border-white/15 hover:border-white/30 text-white font-semibold text-base px-8 py-4 rounded-full flex items-center justify-center gap-2 transition-colors"
              >
                Set Up a Commercial Account
              </a>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
              {["Our crew — not independent haulers", "Insured & COI-ready", "Documentation on every job"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-sm text-white/45">
                  <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="border-t border-white/5 bg-white/[0.02]">
          <div className="max-w-7xl mx-auto px-5 py-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {TRUST_BAR.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#22c55e]" />
                  </div>
                  <span className="text-sm text-white/70 font-medium leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5">
          <div className="mb-14 max-w-2xl">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-3">
              Built for properties
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Services made for the jobs you actually deal with
            </h2>
            <p className="mt-4 text-white/45 text-base">
              Not generic "junk." These are the situations our crew handles every week for property managers across Tampa Bay.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group bg-white/4 border border-white/8 rounded-2xl p-6 hover:border-[#22c55e]/40 hover:bg-white/6 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mb-4 group-hover:bg-[#22c55e]/20 transition-colors">
                  <Icon className="w-5 h-5 text-[#22c55e]" />
                </div>
                <h3 className="font-bold text-white text-base">{title}</h3>
                <p className="mt-1.5 text-sm text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOCUMENTATION */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest">
              Documentation
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
              We don't just remove it.
              <br />
              <span className="text-[#22c55e]">We document it.</span>
            </h2>
            <p className="text-white/50 text-base leading-relaxed">
              Every job closes with a completion packet that helps your team close the work order, report to ownership, and keep clean records — without chasing the vendor for paperwork.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              {DOC_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-4 py-3">
                  <CheckCircle className="w-4 h-4 text-[#22c55e] shrink-0" />
                  <span className="text-sm text-white/75">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mock work-order card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#22c55e]/12 to-transparent rounded-3xl blur-3xl pointer-events-none" />
            <div className="relative bg-white/4 border border-white/8 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-[#22c55e]" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Completion Packet</p>
                    <p className="text-white/35 text-xs">Work Order #PM-4821</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#22c55e]/15 text-[#22c55e] px-2.5 py-1 rounded-full border border-[#22c55e]/30">
                  Completed
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-white/35 uppercase tracking-wider mb-1">Property</p>
                  <p className="text-white/85 font-medium">Bayshore Apartments</p>
                </div>
                <div>
                  <p className="text-white/35 uppercase tracking-wider mb-1">Unit</p>
                  <p className="text-white/85 font-medium">Bldg 4 · #212</p>
                </div>
                <div>
                  <p className="text-white/35 uppercase tracking-wider mb-1">Completed</p>
                  <p className="text-white/85 font-medium">Jul 18 · 2:40 PM</p>
                </div>
                <div>
                  <p className="text-white/35 uppercase tracking-wider mb-1">Volume</p>
                  <p className="text-white/85 font-medium">3/4 truckload</p>
                </div>
              </div>

              <div>
                <p className="text-white/35 uppercase tracking-wider text-xs mb-2">Before & After</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-white/5 border border-white/8">
                    <img src={BEFORE_AFTERS[0].before} alt="Before" className="w-full h-full object-cover" />
                  </div>
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-white/5 border border-white/8">
                    <img src={BEFORE_AFTERS[0].after} alt="After" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              <div className="bg-[#0d1410] border border-white/8 rounded-xl p-4">
                <p className="text-white/35 uppercase tracking-wider text-xs mb-1.5">Items removed</p>
                <p className="text-sm text-white/70 leading-relaxed">
                  2 mattresses, sofa, dining table, 4 chairs, 6 bags household trash, patio debris
                </p>
                <p className="text-white/35 uppercase tracking-wider text-xs mt-3 mb-1.5">Issues noticed</p>
                <p className="text-sm text-white/70 leading-relaxed">
                  Water stain on unit flooring near bathroom — recommend maintenance follow-up.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs text-white/45">
                  <Receipt className="w-4 h-4 text-[#22c55e]" />
                  Invoice attached · PM-4821
                </div>
                <div className="flex items-center gap-2 text-xs text-white/45">
                  <Recycle className="w-4 h-4 text-[#22c55e]" />
                  Disposal receipt
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMERCIAL ACCOUNT BENEFITS */}
      <section id="account" className="py-24 border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="mb-14 max-w-2xl">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-3">
              Commercial account
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              One account. Your whole portfolio.
            </h2>
            <p className="mt-4 text-white/45 text-base">
              A commercial account with Squatterz means one reliable crew, one point of contact, and paperwork your accounting team can actually process.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACCOUNT_BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white/4 border border-white/8 rounded-2xl p-6 hover:border-[#22c55e]/40 hover:bg-white/6 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#22c55e]" />
                </div>
                <h3 className="font-bold text-white text-base">{title}</h3>
                <p className="mt-1.5 text-sm text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="process" className="py-24 border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-3">
              How it works
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              From work order to completion packet
            </h2>
            <p className="mt-3 text-white/45 text-base max-w-xl mx-auto">
              The last step is what sets our crew apart — you get documentation that helps you close the work order and report back to owners.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {STEPS.map(({ num, icon: Icon, title, desc }) => (
              <div
                key={num}
                className="relative bg-white/4 border border-white/8 rounded-2xl p-7 hover:border-[#22c55e]/40 hover:bg-white/6 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#22c55e] flex items-center justify-center shrink-0">
                    <span className="font-black text-black text-base">{num}</span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-white/6 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-white/60" />
                  </div>
                </div>
                <h3 className="mt-5 font-bold text-white text-lg">{title}</h3>
                <p className="mt-1.5 text-sm text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BEFORE & AFTER PROOF */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-3">
              Proof of work
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Before-and-after, from real jobs
            </h2>
            <p className="mt-3 text-white/45 text-base max-w-xl mx-auto">
              Every packet is delivered to the manager. Here's a sample of what that looks like.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {BEFORE_AFTERS.map((job) => (
              <div key={job.title} className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-2 gap-px bg-white/8">
                  <div className="relative aspect-[4/3] bg-[#0d1410]">
                    <img src={job.before} alt="Before" className="w-full h-full object-cover" />
                    <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider bg-black/70 text-white px-2 py-1 rounded">
                      Before
                    </span>
                  </div>
                  <div className="relative aspect-[4/3] bg-[#0d1410]">
                    <img src={job.after} alt="After" className="w-full h-full object-cover" />
                    <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider bg-[#22c55e] text-black px-2 py-1 rounded">
                      After
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-white text-lg">{job.title}</h3>
                  <p className="mt-1.5 text-sm text-white/45 leading-relaxed">{job.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACCOUNT SETUP FORM */}
      <section id="account-setup" className="py-24 border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-3">
              Get started
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Let's get your account set up
            </h2>
            <p className="mt-3 text-white/45 text-base max-w-lg mx-auto">
              Tell us about your portfolio and we'll reach out with onboarding documents — COI, W-9, and a service agreement tailored to your properties.
            </p>
          </div>

          {submitted ? (
            <div className="bg-white/4 border border-[#22c55e]/30 rounded-2xl p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-[#22c55e]" />
              </div>
              <h3 className="text-xl font-bold text-white">Request received</h3>
              <p className="text-white/55 text-sm max-w-md mx-auto">
                Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""} — our account manager will reach out within one business day with onboarding paperwork.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setForm({ name: "", property: "", email: "", phone: "", notes: "" });
                }}
                className="text-sm text-[#22c55e] font-semibold hover:underline"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="bg-white/4 border border-white/8 rounded-2xl p-6 md:p-8 space-y-5"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Field icon={User} label="Your name">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jordan Rivera"
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                  />
                </Field>
                <Field icon={Building2} label="Property / portfolio name">
                  <input
                    required
                    value={form.property}
                    onChange={(e) => setForm({ ...form, property: e.target.value })}
                    placeholder="Bayshore Apartments"
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                  />
                </Field>
                <Field icon={Mail} label="Email">
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jordan@managementco.com"
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                  />
                </Field>
                <Field icon={Phone} label="Phone">
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(813) 555-0123"
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                  />
                </Field>
              </div>

              <Field icon={ClipboardList} label="Tell us about your needs">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Number of properties, typical turnaround needs, recurring pickup interest..."
                  rows={4}
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none resize-none"
                />
              </Field>

              <button
                type="submit"
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.98] text-black font-bold text-base py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                Request Property Service <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-center text-xs text-white/30">
                We'll respond within one business day · No obligation to start service
              </p>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-3">
              FAQ
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Questions before you call
            </h2>
            <p className="mt-3 text-white/45 text-base">
              The answers property managers need before adding a vendor to their list.
            </p>
          </div>

          <div className="border-t border-white/8">
            {FAQS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>

          <div className="mt-12 text-center bg-white/4 border border-white/8 rounded-2xl p-8 space-y-4">
            <h3 className="text-xl font-bold text-white">Still have questions?</h3>
            <p className="text-white/50 text-sm max-w-md mx-auto">
              Talk to our account manager about access protocols, COI requirements, and service agreements.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a
                href="tel:8135550123"
                className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold px-7 py-3.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" /> (813) 555-0123
              </a>
              <a
                href="#account-setup"
                className="border border-white/15 hover:border-white/30 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
              >
                Set Up Account <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-[#0a0f0d]" />
            </div>
            <span className="font-black tracking-widest text-xs uppercase text-white">
              Squatterz
            </span>
          </a>
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} Squatterz LLC · Tampa, FL · All rights reserved
          </p>
          <div className="flex gap-6 text-xs text-white/30">
            <a href="/" className="hover:text-white/60 transition-colors">Residential</a>
            <a href="/commercial" className="hover:text-white/60 transition-colors">Commercial</a>
            <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

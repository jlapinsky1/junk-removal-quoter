import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Phone,
  Star,
  Camera,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
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
  Briefcase,
  Home,
} from "lucide-react";
import CommercialNav from "../components/commercial/CommercialNav";
import CommercialFooter from "../components/commercial/CommercialFooter";
import { makeCanonical, makeTitle, SITE_URL, DEFAULT_OG_IMAGE } from "../utils/seo";
import { trackEvent } from "../utils/analytics";

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
  { icon: Building2, title: "Multi-property management", desc: "Submit and track cleanup requests across your entire portfolio — one account, every property." },
  { icon: ClipboardList, title: "Work order submission", desc: "Create a request, attach photos, set a deadline, and submit. Future requests take only a few clicks." },
  { icon: CalendarClock, title: "Portfolio-wide job visibility", desc: "See every open job across all properties with statuses: Requested, Under Review, Scheduled, In Progress, Completed." },
  { icon: Receipt, title: "Invoice management", desc: "Invoices organized by property, unit, purchase order, or internal reference. Pay and download from the portal." },
  { icon: FileText, title: "Completion documentation", desc: "Before-and-after photos, completion notes, and records available in the portal after every job." },
];

const FAQS = [
  { q: "Can you work without a manager present?", a: "Yes. As long as access has been arranged — keys, gate codes, or lockbox — our crew can complete the removal and document everything without anyone on-site." },
  { q: "How quickly can you complete a turnover?", a: "Turnaround depends on volume, access, and scheduling availability. Contact us for timing on your specific request." },
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
];

const PROBLEM_CARDS = [
  { icon: Sofa, title: "Abandoned furniture after move-out", desc: "Mattresses, sofas, and appliances left behind delay the next turn and keep the unit off the market longer than it needs to be." },
  { icon: AlertTriangle, title: "Eviction and abandoned-property debris", desc: "Time-sensitive removal with the documentation your team and ownership need — photos, completion notes, and an itemized invoice." },
  { icon: Trash2, title: "Dumpster overflow and bulk trash", desc: "Overfilled enclosures become code violations and tenant complaints. Coordinated removal stops the problem before it escalates." },
  { icon: Warehouse, title: "Illegal dumping on the lot", desc: "Third-party debris in parking lots, alleys, and behind dumpsters. We remove it, document it, and clear the area." },
];

const SCENARIO_STEPS = [
  { num: "1", title: "Submit the work order", desc: "The maintenance coordinator opens the portal, creates a request for the property, attaches a photo from their phone, and sets the deadline — Friday morning before the HOA walkthrough." },
  { num: "2", title: "Approve the estimate", desc: "Squatterz reviews the photos and sends a line-item estimate. The coordinator approves it from their phone — no back-and-forth calls needed." },
  { num: "3", title: "Crew handles the removal", desc: "No one needs to be on-site. Access was arranged via gate code. The mattresses are cleared and the area is reset." },
  { num: "4", title: "Completion packet delivered", desc: "Before-and-after photos, completion notes, and an invoice labeled with the property address are available in the portal by end of day." },
];

const WHO_TILES = [
  { icon: Building2, label: "Apartment and multifamily operators", desc: "Ongoing unit turns, evictions, and common-area cleanup for communities of any size." },
  { icon: Home, label: "Single-family rental portfolio owners", desc: "Move-out cleanouts and bulk removal across scattered-site rentals." },
  { icon: Users, label: "HOA and community managers", desc: "Common-area cleanup, bulk trash, and dumpster enclosure reset for residential communities." },
  { icon: Briefcase, label: "Commercial property managers", desc: "Office, retail, and mixed-use properties with furniture, renovation debris, and bulk removal needs." },
  { icon: Warehouse, label: "Property maintenance companies", desc: "Subcontract cleanup work across your client portfolio without adding another vendor relationship." },
  { icon: FileCheck, label: "Real estate investors and flippers", desc: "Estate cleanouts, distressed-property cleanup, and pre-sale debris removal." },
];

const SERVICE_CITIES = [
  { city: "Hoschton", county: "Jackson County" },
  { city: "Braselton", county: "Jackson County" },
  { city: "Gainesville", county: "Hall County" },
  { city: "Buford", county: "Gwinnett County" },
  { city: "Sugar Hill", county: "Gwinnett County" },
  { city: "Suwanee", county: "Gwinnett County" },
  { city: "Winder", county: "Barrow County" },
  { city: "Lawrenceville", county: "Gwinnett County" },
  { city: "Jefferson", county: "Jackson County" },
  { city: "Commerce", county: "Jackson County" },
  { city: "Oakwood", county: "Hall County" },
  { city: "Flowery Branch", county: "Hall County" },
  { city: "Cumming", county: "Forsyth County" },
  { city: "Dawsonville", county: "Dawson County" },
];

const COMMERCIAL_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["LocalBusiness", "Organization"],
      "@id": "https://gosquatterz.com/#organization",
      "name": "Squatterz LLC",
      "url": "https://gosquatterz.com",
      "telephone": "+17706282877",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Hoschton",
        "addressRegion": "GA",
        "postalCode": "30548",
        "addressCountry": "US",
      },
      "areaServed": [
        "Hoschton, GA", "Braselton, GA", "Gainesville, GA", "Buford, GA",
        "Sugar Hill, GA", "Suwanee, GA", "Winder, GA", "Lawrenceville, GA",
        "Jefferson, GA", "Commerce, GA", "Oakwood, GA", "Flowery Branch, GA",
        "Cumming, GA", "Dawsonville, GA",
      ],
      "description": "Commercial junk removal and property cleanup for property managers in Northeast Georgia.",
      "logo": "https://gosquatterz.com/logo-squatterz.png",
      "image": "https://gosquatterz.com/logo-squatterz.png",
    },
    {
      "@type": "Service",
      "serviceType": "Commercial Junk Removal",
      "provider": { "@id": "https://gosquatterz.com/#organization" },
      "areaServed": "Northeast Georgia",
      "name": "Commercial Property Cleanup Services",
      "url": "https://gosquatterz.com/commercial",
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://gosquatterz.com/" },
        { "@type": "ListItem", "position": 2, "name": "Commercial Services", "item": "https://gosquatterz.com/commercial" },
      ],
    },
  ],
};

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

export default function Commercial() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white font-sans antialiased">
      <Helmet>
        <title>{makeTitle("Commercial Junk Removal for Property Managers")}</title>
        <meta name="description" content="Squatterz handles tenant cleanouts, eviction debris, bulk trash, and recurring cleanup for property managers across Northeast Georgia. Documentation on every job." />
        <link rel="canonical" href={makeCanonical("/commercial")} />
        <meta property="og:title" content="Commercial Junk Removal for Property Managers | Squatterz" />
        <meta property="og:description" content="One cleanup partner for every property you manage. Fast cleanouts, clear documentation, insured crew — Gainesville, Hoschton, Braselton, and Northeast GA." />
        <meta property="og:url" content={makeCanonical("/commercial")} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${SITE_URL}${DEFAULT_OG_IMAGE}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(COMMERCIAL_JSON_LD)}</script>
      </Helmet>

      <CommercialNav />

      {/* HERO */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#22c55e]/8 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-5 py-20 md:py-28">
          <div className="lg:flex lg:items-center lg:gap-12">
            <div className="lg:w-1/2 space-y-8">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <Building2 className="w-4 h-4 text-[#22c55e]" />
                <span className="text-white/80 font-medium">For Property Managers &amp; Commercial Accounts</span>
              </div>

              <div>
                <h1 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight text-white">
                  One Cleanup Partner for{" "}
                  <span className="text-[#22c55e]">Every Property You Manage</span>
                </h1>
                <p className="mt-6 text-xl md:text-2xl font-semibold text-white/80">
                  Fast cleanouts. Clear documentation. One reliable crew.
                </p>
                <p className="mt-4 text-base text-white/55 leading-relaxed max-w-2xl">
                  Squatterz handles tenant move-outs, abandoned belongings, bulk-item pickups, property cleanups, and recurring removal services for apartments and rental properties across Northeast Georgia.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    trackEvent("commercial_onboarding_start", { location: "hero" });
                    navigate("/portal/start");
                  }}
                  className="bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.98] text-black font-bold text-base px-8 py-4 rounded-full flex items-center justify-center gap-2 transition-all"
                >
                  Request an Estimate <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  to="/commercial/client-portal"
                  onClick={() => trackEvent("portal_demo_click", { location: "hero" })}
                  className="border border-white/15 hover:border-white/30 text-white font-semibold text-base px-8 py-4 rounded-full flex items-center justify-center gap-2 transition-colors"
                >
                  See the Client Portal
                </Link>
              </div>

              <p className="text-sm text-white/35 leading-relaxed">
                Tell us about the cleanup first. When you submit, you'll create secure portal access so the property and request are ready for next time.
              </p>

              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
                {["Our crew — not independent haulers", "Insured &amp; COI-ready", "Documentation on every job"].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-white/45">
                    <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                    <span dangerouslySetInnerHTML={{ __html: t }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2 mt-10 lg:mt-0 flex justify-center lg:justify-end">
              <img
                src="/trailer-hero.png"
                alt="Squatterz dump trailer ready for commercial property cleanouts in Northeast Georgia"
                style={{
                  display: "block",
                  width: "min(90%, 600px)",
                  height: "auto",
                  mixBlendMode: "multiply",
                  filter: "drop-shadow(0 20px 40px rgba(34, 197, 94, 0.15))",
                }}
              />
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

      {/* AUDIENCE + PROBLEM */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5">
          <div className="mb-14 max-w-2xl">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-3">
              Why property managers call us
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Recurring problems. One reliable partner.
            </h2>
            <p className="mt-4 text-white/45 text-base">
              These aren't one-off situations — they happen across every property, every month. Squatterz is built to handle them cleanly, quickly, and with the documentation your team needs.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {PROBLEM_CARDS.map(({ icon: Icon, title, desc }) => (
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
              Not generic "junk." These are the situations our crew handles every week for property managers across Northeast Georgia — Gainesville, Hoschton, Braselton, and surrounding areas.
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
                <p className="text-white/35 uppercase tracking-wider text-xs mb-2">Before &amp; After</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-white/5 border border-white/8">
                    <img src={BEFORE_AFTERS[0].before} alt="Unit before cleanout" className="w-full h-full object-cover" />
                  </div>
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-white/5 border border-white/8">
                    <img src={BEFORE_AFTERS[0].after} alt="Unit after cleanout" className="w-full h-full object-cover" />
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

      {/* CLIENT PORTAL SHOWCASE */}
      <section id="portal" className="py-24 border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="mb-14 max-w-2xl">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-3">
              Client portal
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Property cleanup without the phone tag
            </h2>
            <p className="mt-4 text-white/45 text-base">
              The Squatterz client portal gives property managers a single dashboard for all active work orders, job statuses, completion documentation, and invoices across every property in your portfolio.
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

          <div className="mt-10 text-center">
            <Link
              to="/commercial/client-portal"
              onClick={() => trackEvent("portal_demo_click", { location: "portal_section" })}
              className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 text-white font-semibold text-sm px-7 py-3.5 rounded-full transition-colors"
            >
              Learn More About the Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* PRACTICAL SCENARIO */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-3">
              In practice
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              What this looks like on a real property
            </h2>
            <p className="mt-3 text-white/45 text-base max-w-xl mx-auto">
              A maintenance coordinator for a 48-unit apartment community notices a mattress and box spring stacked against the dumpster enclosure — before the Friday HOA walkthrough.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {SCENARIO_STEPS.map(({ num, title, desc }) => (
              <div
                key={num}
                className="relative bg-white/4 border border-white/8 rounded-2xl p-7 hover:border-[#22c55e]/40 hover:bg-white/6 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-[#22c55e] flex items-center justify-center shrink-0 mb-4">
                  <span className="font-black text-black text-sm">{num}</span>
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

      {/* WHO WE WORK WITH */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5">
          <div className="mb-14 max-w-2xl">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-3">
              Who we work with
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Built for anyone who manages properties
            </h2>
            <p className="mt-4 text-white/45 text-base">
              Whether you manage one building or a regional portfolio, Squatterz fits into your existing operations.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WHO_TILES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="bg-white/4 border border-white/8 rounded-2xl p-6 hover:border-[#22c55e]/40 hover:bg-white/6 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#22c55e]" />
                </div>
                <h3 className="font-bold text-white text-base">{label}</h3>
                <p className="mt-1.5 text-sm text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICE AREA */}
      <section className="py-24 border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="mb-12 max-w-2xl">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-3">
              Where we work
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Serving Northeast Georgia
            </h2>
            <p className="mt-4 text-white/50 text-base leading-relaxed">
              Squatterz operates out of Hoschton, GA (ZIP 30548) and serves properties within approximately 50 miles. Availability depends on address, job scope, scheduling, and disposal requirements.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            {SERVICE_CITIES.map(({ city, county }) => (
              <div key={city} className="bg-white/4 border border-white/8 rounded-xl px-3 py-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <MapPin className="w-3 h-3 text-[#22c55e] shrink-0" />
                  <span className="text-white text-sm font-semibold">{city}</span>
                </div>
                <span className="text-white/30 text-[10px]">{county}</span>
              </div>
            ))}
          </div>

          <Link
            to="/commercial/service-area"
            className="inline-flex items-center gap-2 text-[#22c55e] text-sm font-semibold hover:text-white transition-colors"
          >
            View full service area &amp; coverage details <ArrowRight className="w-4 h-4" />
          </Link>
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
                href="tel:7706282877"
                onClick={() => trackEvent("commercial_phone_click", { location: "faq" })}
                className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold px-7 py-3.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" /> (770) 628-2877
              </a>
              <button
                onClick={() => {
                  trackEvent("commercial_onboarding_start", { location: "faq" });
                  navigate("/portal/start");
                }}
                className="border border-white/15 hover:border-white/30 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
              >
                Request an Estimate <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#22c55e]/6 rounded-full blur-[100px]" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            Ready to get started?
          </h2>
          <p className="mt-4 text-white/50 text-base max-w-lg mx-auto">
            Create your commercial account, add your first property, and submit a work order. We review every request and confirm scheduling before anything is dispatched.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                trackEvent("commercial_onboarding_start", { location: "final_cta" });
                navigate("/portal/start");
              }}
              className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-base px-8 py-4 rounded-full flex items-center justify-center gap-2 transition-all"
            >
              Request an Estimate <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="tel:7706282877"
              onClick={() => trackEvent("commercial_phone_click", { location: "final_cta" })}
              className="border border-white/15 hover:border-white/30 text-white font-semibold text-base px-8 py-4 rounded-full flex items-center justify-center gap-2 transition-colors"
            >
              <Phone className="w-4 h-4" /> (770) 628-2877
            </a>
          </div>
        </div>
      </section>

      <CommercialFooter />
    </div>
  );
}

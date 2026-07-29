import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Phone,
  Camera,
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
  AlertTriangle,
  Home,
  Briefcase,
  LayoutDashboard,
  Package,
  Recycle,
} from "lucide-react";
import CommercialNav from "../components/commercial/CommercialNav";
import CommercialFooter from "../components/commercial/CommercialFooter";
import { makeCanonical, makeTitle, SITE_URL, DEFAULT_OG_IMAGE } from "../utils/seo";
import { trackEvent } from "../utils/analytics";

const VENDOR_PROOF = [
  { icon: Package, label: "One item to full cleanouts" },
  { icon: Camera, label: "Before-and-after on every job" },
  { icon: FileText, label: "Written estimates before dispatch" },
  { icon: Receipt, label: "Property & unit-labeled invoices" },
  { icon: LayoutDashboard, label: "Free client portal included" },
];

const PROBLEM_CARDS = [
  {
    icon: Home,
    title: "Abandoned furniture after move-out",
    desc: "Mattresses, sofas, and appliances delay turns and keep units off the market.",
  },
  {
    icon: AlertTriangle,
    title: "Eviction and abandoned-property debris",
    desc: "Time-sensitive removal with photos, notes, and invoices your ownership team expects.",
  },
  {
    icon: Trash2,
    title: "Dumpster overflow and bulk trash",
    desc: "Overfilled enclosures become code issues. Coordinated pickup before complaints stack up.",
  },
  {
    icon: Package,
    title: "Illegal dumping on the lot",
    desc: "Third-party debris in lots, alleys, and behind dumpsters, removed and documented.",
  },
];

const SERVICES = [
  {
    icon: Building2,
    title: "Apartment and Unit Cleanouts",
    desc: "Move-out debris, furniture, appliances, patio items, and household trash from any unit.",
    to: "/commercial/apartment-cleanouts",
  },
  {
    icon: AlertTriangle,
    title: "Eviction and Abandoned-Property Cleanup",
    desc: "Fast clearance when tenants leave belongings behind, with the records your file needs.",
    to: "/commercial/eviction-cleanup",
  },
  {
    icon: ClipboardList,
    title: "Unit Turnover Debris Removal",
    desc: "Turn-ready cleanouts so maintenance can paint, repair, and re-list without waiting on haul-off.",
    to: "/commercial/unit-turnover-cleanout",
  },
  {
    icon: Trash2,
    title: "Bulk Trash and Dumpster-Area Pickup",
    desc: "Overflow enclosures, breezeway bulk items, storage areas, and renovation debris.",
    to: "/commercial/bulk-trash-removal",
  },
  {
    icon: Package,
    title: "Illegal Dumping Removal",
    desc: "Dumped furniture and trash removed from lots, alleys, and common areas, photo-documented.",
    to: "/commercial/illegal-dumping-removal",
  },
  {
    icon: CalendarClock,
    title: "Recurring Multi-Property Cleanup",
    desc: "Scheduled pickups across your portfolio: one portal, one crew, every property tracked.",
    to: "/commercial/property-management-cleanup",
  },
];

const PORTAL_POINTS = [
  "Submit requests with photos, unit numbers, and access notes",
  "Track every job: pending review → scheduled → completed",
  "Manage multiple properties under one account",
  "Download completion packets, photos, and invoices anytime",
];

const DOC_ITEMS = [
  "Before & after photos",
  "Completion notes",
  "Property & unit on invoice",
  "Disposal receipt on request",
];

const SCENARIO_STEPS = [
  { num: "1", title: "Request submitted", desc: "The coordinator opens the portal, attaches a photo from the dumpster area, and sets a deadline before the HOA walkthrough." },
  { num: "2", title: "Estimate reviewed", desc: "Squatterz reviews the scope and sends a line-item estimate. The coordinator approves from their phone. No phone tag." },
  { num: "3", title: "Cleanup completed", desc: "Crew clears the mattresses using the gate code. No one needs to stay on-site." },
  { num: "4", title: "Documentation delivered", desc: "Before-and-after photos, completion notes, and a labeled invoice land in the portal the same day." },
];

const WHO_TILES = [
  { icon: Building2, label: "Apartment & multifamily operators" },
  { icon: Home, label: "Single-family rental portfolios" },
  { icon: Users, label: "HOA & community managers" },
  { icon: Briefcase, label: "Commercial property managers" },
  { icon: ClipboardList, label: "Maintenance & rehab contractors" },
  { icon: FileCheck, label: "Investors & property owners" },
];

const SERVICE_AREA_SUMMARY = [
  "Hoschton", "Braselton", "Gainesville", "Buford", "Suwanee",
  "Lawrenceville", "Winder", "Jefferson", "Flowery Branch", "Cumming",
];

const FAQS = [
  {
    q: "Can you work without a manager on-site?",
    a: "Yes. Provide keys, gate codes, or lockbox access and our crew completes the job and uploads documentation without anyone present.",
  },
  {
    q: "What's included in the completion packet?",
    a: "Dated before-and-after photos, completion notes, items removed, any issues noticed on-site, and an invoice labeled with property and unit.",
  },
  {
    q: "Can invoices include a property, unit, or PO number?",
    a: "Yes. Every invoice is labeled with the property name, unit, and any internal reference you provide at submission.",
  },
  {
    q: "How does the client portal help multi-property teams?",
    a: "One account covers your whole portfolio: submit work orders, track open jobs, and pull completion records and invoices without emailing back and forth.",
  },
  {
    q: "Do you offer recurring service?",
    a: "Yes. Weekly, biweekly, or monthly pickups across multiple properties, all scheduled and tracked in the portal.",
  },
  {
    q: "Do you handle small pickups, or only full cleanouts?",
    a: "Both. One mattress beside a dumpster, a couch in a breezeway, or a full unit-turn cleanout. Same portal, same documentation. No minimum project size.",
  },
  {
    q: "What if the load is larger than estimated?",
    a: "We stop and request authorization before exceeding approved scope. No surprise charges.",
  },
];

const COMPLETION_PACKET_IMAGES = {
  before: "https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2",
  after: "https://images.pexels.com/photos/6585757/pexels-photo-6585757.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2",
};

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
      "areaServed": SERVICE_AREA_SUMMARY.map((c) => `${c}, GA`),
      "description": "Commercial property cleanup with a client portal for property managers across Northeast Georgia. Every job tracked with completion documentation.",
      "logo": "https://gosquatterz.com/logo-squatterz.png",
      "image": "https://gosquatterz.com/logo-squatterz.png",
    },
    {
      "@type": "Service",
      "serviceType": "Commercial Property Cleanup",
      "provider": { "@id": "https://gosquatterz.com/#organization" },
      "areaServed": "Northeast Georgia",
      "name": "Commercial Property Cleanup with Client Portal",
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

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-white font-semibold text-base group-hover:text-[#22c55e] transition-colors">{q}</span>
        <ChevronDown className={`w-5 h-5 text-[#22c55e] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0"}`}>
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
        <title>{makeTitle("Commercial Property Cleanup with Client Portal")}</title>
        <meta
          name="description"
          content="Request apartment cleanouts, eviction cleanup, unit-turn debris removal, and recurring property cleanup across Northeast Georgia. Track every job, completion packet, and invoice in one free commercial portal."
        />
        <link rel="canonical" href={makeCanonical("/commercial")} />
        <meta property="og:title" content="Commercial Property Cleanup with Client Portal | Squatterz" />
        <meta
          property="og:description"
          content="Every order tracked. Completion packets with photos. Free portal for multi-unit property managers across Northeast Georgia."
        />
        <meta property="og:url" content={makeCanonical("/commercial")} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${SITE_URL}${DEFAULT_OG_IMAGE}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(COMMERCIAL_JSON_LD)}</script>
      </Helmet>

      <CommercialNav />

      {/* 1. HERO */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#22c55e]/8 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-5 py-16 md:py-24">
          <div className="lg:flex lg:items-center lg:gap-12">
            <div className="lg:w-1/2 space-y-7">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                <LayoutDashboard className="w-4 h-4 text-[#22c55e]" />
                <span className="text-white/80 font-medium">Commercial Portal Included</span>
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-white">
                  Every Job Tracked.{" "}
                  <span className="text-[#22c55e]">Every Cleanup Documented.</span>
                </h1>
                <p className="mt-5 text-lg md:text-xl text-white/70 leading-relaxed max-w-xl">
                  From a single mattress or trash pickup to full unit cleanouts and recurring portfolio work. Request apartment cleanouts, eviction cleanup, unit-turn debris removal, bulk pickups, and property cleanup across Northeast Georgia, then manage every property, estimate, open job, completion record, and invoice from one commercial portal.
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

              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {["One mattress to full cleanouts", "Completion packets with photos", "Free portal access"].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-white/45">
                    <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2 mt-10 lg:mt-0 flex justify-center lg:justify-end">
              <img
                src="/trailer-hero.png"
                alt="Squatterz commercial cleanup crew serving property managers in Northeast Georgia"
                style={{
                  display: "block",
                  width: "min(90%, 560px)",
                  height: "auto",
                  mixBlendMode: "multiply",
                  filter: "drop-shadow(0 20px 40px rgba(34, 197, 94, 0.15))",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Vendor-readiness band */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-5 py-10 md:py-12">
          <div className="text-center mb-8 max-w-2xl mx-auto">
            <h2 className="text-xl md:text-2xl font-black text-white">
              A cleanup crew with a system behind it
            </h2>
            <p className="mt-3 text-sm md:text-base text-white/50 leading-relaxed">
              Squatterz combines real-world property cleanup with a client portal built for recurring property operations. Need someone to grab one item before an inspection? Planning a full turnover or recurring pickups across a portfolio? Every request, small or large, stays connected to the right property, estimate, completion record, and invoice.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
            {VENDOR_PROOF.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center text-center gap-2 md:gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#22c55e]" />
                </div>
                <span className="text-xs md:text-sm text-white/65 font-medium leading-snug">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Recurring property problems */}
      <section className="py-20 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5">
          <div className="mb-10 max-w-2xl">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-2">Recurring problems</p>
            <h2 className="text-2xl md:text-3xl font-black text-white">The situations that slow every property down</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {PROBLEM_CARDS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/4 border border-white/8 rounded-2xl p-5 hover:border-[#22c55e]/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-[#22c55e]" />
                </div>
                <h3 className="font-bold text-white text-base">{title}</h3>
                <p className="mt-1 text-sm text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Six service categories */}
      <section id="services" className="py-20 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5">
          <div className="mb-10 max-w-2xl">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-2">Services</p>
            <h2 className="text-2xl md:text-3xl font-black text-white">Commercial cleanup for property operations</h2>
            <p className="mt-3 text-white/45 text-sm md:text-base">
              Six core categories, not a menu of fifty options. Mattresses, appliances, furniture, renovation debris, patio items, storage areas, and office cleanouts fit inside these.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map(({ icon: Icon, title, desc, to }) => (
              <Link
                key={title}
                to={to}
                className="group bg-white/4 border border-white/8 rounded-2xl p-5 hover:border-[#22c55e]/40 hover:bg-white/6 transition-all flex flex-col"
              >
                <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mb-3 group-hover:bg-[#22c55e]/20 transition-colors">
                  <Icon className="w-5 h-5 text-[#22c55e]" />
                </div>
                <h3 className="font-bold text-white text-base group-hover:text-[#22c55e] transition-colors">{title}</h3>
                <p className="mt-1 text-sm text-white/45 leading-relaxed flex-1">{desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#22c55e]">
                  Learn more <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Portal + completion packet centerpiece */}
      <section id="portal" className="py-20 border-b border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div className="space-y-6">
              <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest">The difference</p>
              <h2 className="text-2xl md:text-4xl font-black text-white leading-tight">
                Free portal + completion packet on every job
              </h2>
              <p className="text-white/50 text-base leading-relaxed">
                Most haulers show up and leave. Squatterz ties every cleanup to your property account, with estimates, status updates, photo documentation, and invoices you can pull without chasing anyone.
              </p>
              <ul className="space-y-3">
                {PORTAL_POINTS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-white/70">
                    <CheckCircle className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                {DOC_ITEMS.map((item) => (
                  <span key={item} className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-white/60">
                    {item}
                  </span>
                ))}
              </div>
              <Link
                to="/commercial/client-portal"
                onClick={() => trackEvent("portal_demo_click", { location: "portal_section" })}
                className="inline-flex items-center gap-2 text-[#22c55e] text-sm font-semibold hover:text-white transition-colors"
              >
                Explore the client portal <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#22c55e]/12 to-transparent rounded-3xl blur-3xl pointer-events-none" />
              <div className="relative bg-white/4 border border-white/8 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/8 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center">
                      <FileCheck className="w-4 h-4 text-[#22c55e]" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Completion Packet</p>
                      <p className="text-white/35 text-xs">Bayshore Apts · Unit 212</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#22c55e]/15 text-[#22c55e] px-2 py-1 rounded-full border border-[#22c55e]/30">
                    In portal
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-white/5 border border-white/8">
                    <img src={COMPLETION_PACKET_IMAGES.before} alt="Before property cleanout" className="w-full h-full object-cover" />
                  </div>
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-white/5 border border-white/8">
                    <img src={COMPLETION_PACKET_IMAGES.after} alt="After property cleanout" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="bg-[#0d1410] border border-white/8 rounded-xl p-3.5 text-sm text-white/60 leading-relaxed">
                  2 mattresses, sofa, patio debris removed. Water stain noted near bathroom. Maintenance follow-up recommended.
                </div>
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5 text-[#22c55e]" /> Invoice attached</span>
                  <span className="flex items-center gap-1.5"><Recycle className="w-3.5 h-3.5 text-[#22c55e]" /> Disposal receipt</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Real-property workflow example */}
      <section className="py-20 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-5">
          <div className="mb-10 max-w-2xl">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-2">In practice</p>
            <h2 className="text-2xl md:text-3xl font-black text-white">What this looks like on a real property</h2>
            <p className="mt-3 text-white/45 text-base leading-relaxed">
              A maintenance coordinator for a 48-unit community finds two mattresses beside the dumpster before a Friday HOA inspection and handles the whole thing from the portal before lunch.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {SCENARIO_STEPS.map(({ num, title, desc }) => (
              <div key={num} className="bg-white/4 border border-white/8 rounded-2xl p-5">
                <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center mb-3">
                  <span className="font-black text-black text-xs">{num}</span>
                </div>
                <h3 className="font-bold text-white text-base">{title}</h3>
                <p className="mt-1.5 text-sm text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Who you serve */}
      <section className="py-20 border-b border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="mb-10">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-2">Who we serve</p>
            <h2 className="text-2xl md:text-3xl font-black text-white">Built for property operations teams</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {WHO_TILES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-4 py-3.5">
                <Icon className="w-4 h-4 text-[#22c55e] shrink-0" />
                <span className="text-sm text-white/75 font-medium leading-snug">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Service area summary */}
      <section className="py-16 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-2">Service area</p>
              <h2 className="text-2xl md:text-3xl font-black text-white">Northeast Georgia</h2>
              <p className="mt-3 text-white/45 text-sm leading-relaxed">
                Based in Hoschton (30548), serving properties within ~50 miles across Jackson, Hall, Gwinnett, Barrow, and Forsyth counties.
              </p>
            </div>
            <Link
              to="/commercial/service-area"
              className="inline-flex items-center gap-2 text-[#22c55e] text-sm font-semibold hover:text-white transition-colors shrink-0"
            >
              Full coverage map <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {SERVICE_AREA_SUMMARY.map((city) => (
              <span key={city} className="inline-flex items-center gap-1.5 text-xs bg-white/4 border border-white/8 rounded-full px-3 py-1.5 text-white/60">
                <MapPin className="w-3 h-3 text-[#22c55e]" />
                {city}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ */}
      <section id="faq" className="py-20 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-5">
          <div className="mb-10 text-center">
            <p className="text-[#22c55e] text-sm font-semibold uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-2xl md:text-3xl font-black text-white">Before you add us as a vendor</h2>
          </div>
          <div className="border-t border-white/8">
            {FAQS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* 10. Final CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white">Request a commercial estimate</h2>
          <p className="mt-4 text-white/50 text-base max-w-lg mx-auto">
            Tell us about the cleanup. We review every request, send a written estimate, and keep the full record in your portal from day one.
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

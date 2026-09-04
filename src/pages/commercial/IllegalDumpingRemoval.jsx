import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Phone,
  ArrowRight,
  AlertTriangle,
  Building2,
  Users,
  Briefcase,
  MapPin,
  Camera,
  Clock,
  FileCheck,
  CheckCircle,
  Trash2,
  Package,
} from "lucide-react";
import CommercialNav from "../../components/commercial/CommercialNav";
import CommercialFooter from "../../components/commercial/CommercialFooter";
import { makeCanonical, SITE_URL, DEFAULT_OG_IMAGE } from "../../utils/seo";
import { trackEvent } from "../../utils/analytics";

const PAGE_TITLE = "Illegal Dumping Removal for Apartments | Northeast Georgia";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["LocalBusiness", "Organization"],
      "@id": "https://gosquatterz.com/#organization",
      name: "Squatterz LLC",
      url: "https://gosquatterz.com",
      telephone: "+17706282877",
    },
    {
      "@type": "Service",
      serviceType: "Illegal Dumping Removal",
      provider: { "@id": "https://gosquatterz.com/#organization" },
      areaServed: [
        "Gainesville, GA",
        "Buford, GA",
        "Lawrenceville, GA",
        "Braselton, GA",
        "Hoschton, GA",
        "Suwanee, GA",
        "Northeast Georgia",
      ],
      name: "Illegal Dumping Removal for Apartment and Commercial Properties",
      url: makeCanonical("/commercial/illegal-dumping-removal"),
      description:
        "Fast removal of illegally dumped furniture, mattresses, appliances, and debris from apartment communities and commercial properties across Northeast Georgia.",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://gosquatterz.com/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Illegal Dumping Removal",
          item: makeCanonical("/commercial/illegal-dumping-removal"),
        },
      ],
    },
  ],
};

const WHO_WE_SERVE = [
  { icon: Building2, label: "Apartment communities and multifamily operators" },
  { icon: Users, label: "Property managers and maintenance teams" },
  { icon: Briefcase, label: "HOA and community associations" },
  { icon: Package, label: "Commercial lots, retail pads, and vacant land" },
];

const LOCATIONS = [
  "Parking lots and drive aisles",
  "Dumpster enclosures and trash corrals",
  "Alleys and service drives",
  "Breezeways and stairwell landings",
  "Vacant units and storage areas",
  "Behind buildings and fence lines",
];

const ITEMS_REMOVED = [
  "Mattresses and box springs",
  "Sofas, dressers, and furniture",
  "Appliances and televisions",
  "Bagged trash and construction debris",
  "Tires, pallets, and mixed bulk items",
];

const SERVICE_CITIES = [
  "Gainesville",
  "Buford",
  "Lawrenceville",
  "Braselton",
  "Hoschton",
  "Suwanee",
  "Winder",
  "Jefferson",
  "Flowery Branch",
  "Cumming",
];

const FAQ = [
  {
    q: "How fast can you respond to illegal dumping on a property?",
    a: "Submit the request through the portal with photos and access details. We review commercial requests promptly and prioritize dumping that creates inspection, code, or resident-complaint risk. Urgent jobs with gate codes or lockbox access can often be scheduled within one to two business days depending on volume and location.",
  },
  {
    q: "Do you document what was dumped?",
    a: "Yes. Every job includes before-and-after photos, completion notes describing what was removed, and an invoice labeled with the property name and location on site.",
  },
  {
    q: "Can you remove dumping without a manager on-site?",
    a: "Yes. Provide gate codes, lockbox access, or key arrangements in your work order. Our crew clears the area and uploads documentation to your portal without anyone present.",
  },
  {
    q: "Is this different from bulk trash or dumpster overflow?",
    a: "Illegal dumping usually means outside parties left items on your lot without permission. We also handle tenant bulk trash and dumpster overflow. See our bulk trash page for enclosure and common-area pickup details.",
  },
];

const CASE_STUDY = {
  property: "48-unit apartment community, Gwinnett County",
  situation:
    "A maintenance coordinator found two mattresses and a broken couch dumped beside the dumpster enclosure two days before a scheduled HOA inspection. Residents had already complained to the office.",
  outcome:
    "The coordinator submitted a portal request with photos at 9:15 a.m., approved the estimate by phone, and the crew cleared the area using the gate code the same afternoon. Before-and-after photos and a labeled invoice were in the portal before the inspection walkthrough.",
};

export default function IllegalDumpingRemoval() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white">
      <Helmet>
        <title>{PAGE_TITLE} | Squatterz</title>
        <meta
          name="description"
          content="Fast removal of illegally dumped furniture, mattresses, appliances, and debris from apartment communities and commercial properties across Northeast Georgia. Photo documentation included."
        />
        <link rel="canonical" href={makeCanonical("/commercial/illegal-dumping-removal")} />
        <meta property="og:title" content={`${PAGE_TITLE} | Squatterz`} />
        <meta
          property="og:description"
          content="Fast removal of illegally dumped furniture, mattresses, appliances, and debris from apartment communities and commercial properties across Northeast Georgia. Photo documentation included."
        />
        <meta property="og:url" content={makeCanonical("/commercial/illegal-dumping-removal")} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${SITE_URL}${DEFAULT_OG_IMAGE}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>

      <CommercialNav />

      <main className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-5 mb-8">
          <nav className="flex items-center gap-2 text-xs text-white/35">
            <Link to="/" className="hover:text-white/60 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/" className="hover:text-white/60 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white/60">Illegal Dumping Removal</span>
          </nav>
        </div>

        <div className="max-w-4xl mx-auto px-5 mb-16">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <span className="text-[#22c55e] text-xs font-semibold uppercase tracking-widest">Commercial Services</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">
            Illegal Dumping Removal for{" "}
            <span className="text-[#22c55e]">Apartment and Commercial Properties</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-2xl mb-8">
            Someone dumped furniture, mattresses, or trash on your lot without permission. We remove illegally dumped items from apartment communities and commercial properties across Northeast Georgia, document the cleanup with photos, and return the area to a presentable condition before complaints or inspections escalate.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                trackEvent("commercial_onboarding_start", { location: "illegal_dumping_hero" });
                navigate("/portal/start");
              }}
              className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-sm px-6 py-3 rounded-full transition-colors flex items-center gap-2"
            >
              Request an Estimate <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="tel:7706282877"
              onClick={() => trackEvent("commercial_phone_click", { location: "illegal_dumping_hero" })}
              className="flex items-center gap-2 border border-white/15 hover:border-white/30 text-white font-bold text-sm px-6 py-3 rounded-full transition-colors"
            >
              <Phone className="w-4 h-4 text-[#22c55e]" />
              (770) 628-2877
            </a>
          </div>
        </div>

        <section className="max-w-4xl mx-auto px-5 mb-16">
          <h2 className="text-2xl font-black mb-2">Who calls us for illegal dumping</h2>
          <p className="text-white/50 text-sm mb-8">
            Dumping creates liability, resident complaints, and failed inspections. These teams reach out most often.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {WHO_WE_SERVE.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-start gap-3 bg-white/[0.03] border border-white/8 rounded-xl p-5">
                <Icon className="w-5 h-5 text-[#22c55e] shrink-0 mt-0.5" />
                <span className="text-sm text-white/70 font-medium leading-snug">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-5 mb-16">
          <h2 className="text-2xl font-black mb-2">Where dumping shows up on site</h2>
          <p className="text-white/50 text-sm mb-8">
            Items rarely land in one predictable spot. We clear dumping from common problem areas across the property.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {LOCATIONS.map((location) => (
              <div key={location} className="flex items-center gap-2.5 bg-white/[0.03] border border-white/8 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-[#22c55e] shrink-0" />
                <span className="text-sm text-white/65">{location}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-5 mb-16">
          <h2 className="text-2xl font-black mb-2">What we remove</h2>
          <p className="text-white/50 text-sm mb-6">
            Typical illegally dumped loads on apartment and commercial lots include:
          </p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {ITEMS_REMOVED.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-white/60">
                <CheckCircle className="w-4 h-4 text-[#22c55e] shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="max-w-4xl mx-auto px-5 mb-16">
          <h2 className="text-2xl font-black mb-2">Service area</h2>
          <p className="text-white/50 text-sm mb-6 leading-relaxed">
            Based in Braselton, GA, serving apartment communities and commercial properties within roughly 50 miles across Northeast Georgia. Priority coverage includes Gainesville, Buford, Lawrenceville, Braselton, Hoschton, and Suwanee, plus surrounding communities in Jackson, Hall, Gwinnett, Barrow, and Forsyth counties.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {SERVICE_CITIES.map((city) => (
              <span
                key={city}
                className="inline-flex items-center gap-1.5 text-xs bg-white/4 border border-white/8 rounded-full px-3 py-1.5 text-white/60"
              >
                <MapPin className="w-3 h-3 text-[#22c55e]" />
                {city}
              </span>
            ))}
          </div>
          <Link
            to="/commercial/service-area"
            className="inline-flex items-center gap-2 text-[#22c55e] text-sm font-semibold hover:text-white transition-colors"
          >
            Full coverage map <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        <section className="max-w-4xl mx-auto px-5 mb-16">
          <h2 className="text-2xl font-black mb-6">Documentation and response</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/[0.03] border border-white/8 rounded-xl p-5">
              <Camera className="w-5 h-5 text-[#22c55e] mb-3" />
              <h3 className="font-bold text-white text-sm mb-2">Before-and-after photos</h3>
              <p className="text-white/50 text-xs leading-relaxed">
                Dated photos of the dump site before removal and the cleared area after. Stored in your portal with every job.
              </p>
            </div>
            <div className="bg-white/[0.03] border border-white/8 rounded-xl p-5">
              <Clock className="w-5 h-5 text-[#22c55e] mb-3" />
              <h3 className="font-bold text-white text-sm mb-2">Prompt commercial response</h3>
              <p className="text-white/50 text-xs leading-relaxed">
                Submit photos and access details in the portal. We review requests quickly and prioritize dumping that threatens inspections or resident complaints.
              </p>
            </div>
            <div className="bg-white/[0.03] border border-white/8 rounded-xl p-5">
              <FileCheck className="w-5 h-5 text-[#22c55e] mb-3" />
              <h3 className="font-bold text-white text-sm mb-2">Completion record</h3>
              <p className="text-white/50 text-xs leading-relaxed">
                Notes on what was removed, property and location labeled on the invoice, and records you can pull for ownership or file keeping.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-5 mb-16">
          <h2 className="text-2xl font-black mb-2">Example: dumpster-area dumping before an inspection</h2>
          <p className="text-white/50 text-sm mb-6">
            A typical illegal dumping request on a multifamily property:
          </p>
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 md:p-8 space-y-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#22c55e] font-semibold mb-1">Property</p>
              <p className="text-white font-medium text-sm">{CASE_STUDY.property}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#22c55e] font-semibold mb-1">Situation</p>
              <p className="text-white/60 text-sm leading-relaxed">{CASE_STUDY.situation}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#22c55e] font-semibold mb-1">Outcome</p>
              <p className="text-white/60 text-sm leading-relaxed">{CASE_STUDY.outcome}</p>
            </div>
            <div className="border-t border-white/8 pt-5 flex flex-wrap gap-4 text-xs text-white/45">
              <span className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-[#22c55e]" /> Before-and-after photos</span>
              <span className="flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5 text-[#22c55e]" /> Completion notes</span>
              <span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5 text-[#22c55e]" /> Same-day clearance</span>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-5 mb-16">
          <h2 className="text-2xl font-black mb-6">Common questions</h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="bg-white/[0.03] border border-white/8 rounded-xl p-6">
                <h3 className="font-bold text-white mb-2">{q}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-5 mb-16">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#22c55e] mb-4">Related services</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/" className="text-sm text-white/55 hover:text-white border border-white/10 rounded-full px-4 py-2 transition-colors">
              Commercial homepage
            </Link>
            <Link to="/commercial/bulk-trash-removal" className="text-sm text-white/55 hover:text-white border border-white/10 rounded-full px-4 py-2 transition-colors">
              Bulk trash removal
            </Link>
            <Link to="/commercial/apartment-cleanouts" className="text-sm text-white/55 hover:text-white border border-white/10 rounded-full px-4 py-2 transition-colors">
              Apartment cleanouts
            </Link>
            <Link to="/commercial/service-area" className="text-sm text-white/55 hover:text-white border border-white/10 rounded-full px-4 py-2 transition-colors">
              Service area
            </Link>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-5">
          <div className="bg-[#22c55e]/8 border border-[#22c55e]/20 rounded-2xl p-10 text-center">
            <h2 className="text-2xl font-black mb-3">Need illegal dumping removed?</h2>
            <p className="text-white/55 text-sm mb-8 max-w-md mx-auto">
              Add the property to your portal, attach a photo of the dump site, and describe access. We review every request and send a written estimate before dispatch.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  trackEvent("commercial_onboarding_start", { location: "illegal_dumping_cta" });
                  navigate("/portal/start");
                }}
                className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-sm px-8 py-3.5 rounded-full transition-colors"
              >
                Request an Estimate
              </button>
              <a
                href="tel:7706282877"
                onClick={() => trackEvent("commercial_phone_click", { location: "illegal_dumping_cta" })}
                className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors"
              >
                <Phone className="w-4 h-4 text-[#22c55e]" />
                (770) 628-2877
              </a>
            </div>
          </div>
        </section>
      </main>

      <CommercialFooter />
    </div>
  );
}

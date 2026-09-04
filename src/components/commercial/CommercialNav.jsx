import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Phone } from "lucide-react";
import { trackEvent } from "../../utils/analytics";

export default function CommercialNav() {
  const navigate = useNavigate();
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0f0d]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
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
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link to="/#services" className="text-sm text-white/60 hover:text-white transition-colors">Services</Link>
          <Link to="/commercial/illegal-dumping-removal" className="text-sm text-white/60 hover:text-white transition-colors">Illegal Dumping</Link>
          <Link to="/#portal" className="text-sm text-white/60 hover:text-white transition-colors">Client Portal</Link>
          <Link to="/#faq" className="text-sm text-white/60 hover:text-white transition-colors">FAQ</Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a
            href="tel:7706282877"
            onClick={() => trackEvent("commercial_phone_click", { location: "nav" })}
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <Phone className="w-4 h-4 text-[#22c55e]" />
            <span className="font-medium">(770) 628-2877</span>
          </a>
          <button
            onClick={() => navigate("/portal/login")}
            className="border border-white/15 hover:border-white/30 text-white font-bold text-sm px-5 py-2.5 rounded-full transition-colors"
          >
            Client Login
          </button>
          <button
            onClick={() => {
              trackEvent("commercial_onboarding_start", { location: "nav" });
              navigate("/portal/start");
            }}
            className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-sm px-5 py-2.5 rounded-full transition-colors"
          >
            Request an Estimate
          </button>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => navigate("/portal/login")}
            className="border border-white/15 text-white font-bold text-xs px-3 py-2 rounded-full"
          >
            Login
          </button>
          <button
            onClick={() => {
              trackEvent("commercial_onboarding_start", { location: "nav_mobile" });
              navigate("/portal/start");
            }}
            className="bg-[#22c55e] text-black font-bold text-xs px-4 py-2 rounded-full"
          >
            Request an Estimate
          </button>
        </div>
      </div>
    </header>
  );
}

import React from "react";

export const STATUS_META = {
  open:        { label: "Open",        dot: "bg-amber-400",   text: "text-amber-300",   bg: "bg-amber-400/10 border-amber-400/20" },
  scheduled:   { label: "Scheduled",   dot: "bg-sky-400",     text: "text-sky-300",     bg: "bg-sky-400/10 border-sky-400/20" },
  in_progress: { label: "In Progress", dot: "bg-violet-400",  text: "text-violet-300",  bg: "bg-violet-400/10 border-violet-400/20" },
  completed:   { label: "Completed",   dot: "bg-[#22c55e]",   text: "text-[#22c55e]",   bg: "bg-[#22c55e]/10 border-[#22c55e]/20" },
  cancelled:   { label: "Cancelled",   dot: "bg-white/30",    text: "text-white/40",    bg: "bg-white/5 border-white/10" },
};

export const INVOICE_STATUS_META = {
  outstanding: { label: "Outstanding", text: "text-amber-300", bg: "bg-amber-400/10 border-amber-400/20" },
  paid:        { label: "Paid",        text: "text-[#22c55e]", bg: "bg-[#22c55e]/10 border-[#22c55e]/20" },
  overdue:     { label: "Overdue",     text: "text-red-300",   bg: "bg-red-400/10 border-red-400/20" },
  draft:       { label: "Draft",       text: "text-white/40",  bg: "bg-white/5 border-white/10" },
};

export function fmtMoney(n) {
  if (n == null) return "\u2014";
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function fmtDate(s) {
  if (!s) return "\u2014";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDateTime(s) {
  if (!s) return "\u2014";
  return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function timeAgo(s) {
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(s);
}

export function StatusBadge({ status }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${m.bg} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function InvoiceBadge({ status }) {
  const m = INVOICE_STATUS_META[status];
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white/[0.04] border border-white/8 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1.5 text-sm text-white/45">{subtitle}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-5 h-5 text-white/30" />
      </div>
      <p className="text-white/60 font-semibold">{title}</p>
      {subtitle && <p className="text-sm text-white/30 mt-1">{subtitle}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-white/10 border-t-[#22c55e] rounded-full animate-spin" />
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="text-center py-16 px-6">
      <p className="text-red-300 font-semibold text-sm">{message}</p>
      {onRetry ? (
        <button onClick={onRetry} className="mt-3 text-sm text-[#22c55e] font-semibold hover:underline">
          Try again
        </button>
      ) : (
        <p className="text-white/30 text-xs mt-1">Please try again in a moment.</p>
      )}
    </div>
  );
}

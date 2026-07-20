import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, ClipboardList, Receipt, Plus,
  ArrowLeft, ArrowRight, Phone, Mail, MapPin, CalendarClock,
  Camera, FileText, DollarSign, CheckCircle, Clock, Truck,
  User, Trash2, Download, ChevronRight, Menu, X, AlertTriangle, LogOut,
} from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import {
  STATUS_META, INVOICE_STATUS_META, StatusBadge, InvoiceBadge,
  Card, SectionHeader, EmptyState, Spinner, ErrorState,
  fmtMoney, fmtDate, fmtDateTime, timeAgo,
} from "../utils/portalComponents";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "properties", label: "Properties", icon: Building2 },
  { key: "jobs", label: "Jobs", icon: ClipboardList },
  { key: "invoices", label: "Invoices", icon: Receipt },
];

export default function ClientPortal() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined); // undefined = loading
  const [view, setView] = useState({ name: "dashboard" });
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!supabase) { navigate("/portal/login"); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate("/portal/login"); return; }
      setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!s) navigate("/portal/login");
      else setSession(s);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#22c55e] rounded-full animate-spin" />
      </div>
    );
  }

  const go = (v) => { setView(v); setNavOpen(false); window.scrollTo(0, 0); };

  const activeKey =
    view.name === "property" ? "properties"
    : view.name === "job" ? "jobs"
    : view.name === "new-request" ? "dashboard"
    : view.name;

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/portal/login");
  }

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white font-sans antialiased">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0f0d]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <button onClick={() => go({ name: "dashboard" })} className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-[#0a0f0d]" />
            </div>
            <div className="leading-none text-left">
              <span className="text-white font-black tracking-widest text-sm uppercase">Squatterz</span>
              <div className="text-[#22c55e] text-[9px] tracking-[0.2em] font-semibold uppercase mt-0.5">Client Portal</div>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => go({ name: key })}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeKey === key ? "bg-white/8 text-white" : "text-white/50 hover:text-white hover:bg-white/4"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => go({ name: "new-request" })}
              className="hidden sm:flex items-center gap-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-sm px-4 py-2.5 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" /> New Request
            </button>
            <button
              onClick={handleSignOut}
              className="hidden md:flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors px-3 py-2"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setNavOpen((o) => !o)}
              className="md:hidden w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
            >
              {navOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {navOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#0d1410] px-4 py-3 space-y-1">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => go({ name: key })}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  activeKey === key ? "bg-white/8 text-white" : "text-white/60"
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
            <button
              onClick={() => go({ name: "new-request" })}
              className="w-full flex items-center justify-center gap-1.5 bg-[#22c55e] text-black font-bold text-sm px-4 py-3 rounded-xl mt-2"
            >
              <Plus className="w-4 h-4" /> New Request
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-1.5 text-white/40 text-sm py-2.5 mt-1"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">
        {view.name === "dashboard" && <Dashboard go={go} />}
        {view.name === "properties" && <PropertiesView go={go} />}
        {view.name === "property" && <PropertyDetail id={view.id} go={go} />}
        {view.name === "jobs" && <JobsView go={go} />}
        {view.name === "job" && <JobDetail id={view.id} go={go} />}
        {view.name === "invoices" && <InvoicesView go={go} />}
        {view.name === "new-request" && <NewRequest go={go} />}
      </main>

      <footer className="border-t border-white/5 py-8 mt-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <a href="/commercial" className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors">
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
              <Trash2 className="w-3 h-3 text-[#0a0f0d]" />
            </div>
            <span className="font-bold tracking-widest uppercase">Squatterz</span>
          </a>
          <p className="text-xs text-white/25">Client Portal &middot; Gainesville, GA</p>
          <a href="/commercial" className="text-xs text-white/30 hover:text-white/60 transition-colors">Back to Commercial</a>
        </div>
      </footer>
    </div>
  );
}

/* ───────────────────────── DASHBOARD ───────────────────────── */

function Dashboard({ go }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ open: 0, scheduled: 0, completed: 0, outstanding: 0 });
  const [recent, setRecent] = useState([]);
  const [outstandingTotal, setOutstandingTotal] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [openR, scheduledR, completedR, invoicesR, recentR] = await Promise.all([
          supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
          supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "completed"),
          supabase.from("invoices").select("amount").in("status", ["outstanding", "overdue"]),
          supabase.from("jobs").select("*, properties(*)").order("created_at", { ascending: false }).limit(6),
        ]);
        if (openR.error || scheduledR.error || completedR.error || invoicesR.error || recentR.error) {
          throw new Error("Failed to load dashboard data");
        }
        setStats({
          open: openR.count ?? 0,
          scheduled: scheduledR.count ?? 0,
          completed: completedR.count ?? 0,
          outstanding: invoicesR.data?.length ?? 0,
        });
        setOutstandingTotal((invoicesR.data ?? []).reduce((s, i) => s + Number(i.amount), 0));
        setRecent(recentR.data ?? []);
      } catch (e) {
        setError(e.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  const cards = [
    { label: "Open Requests", value: stats.open, icon: ClipboardList, color: "text-amber-300", bg: "bg-amber-400/10 border-amber-400/20", onClick: () => go({ name: "jobs" }) },
    { label: "Upcoming Pickups", value: stats.scheduled, icon: CalendarClock, color: "text-sky-300", bg: "bg-sky-400/10 border-sky-400/20", onClick: () => go({ name: "jobs" }) },
    { label: "Completed Jobs", value: stats.completed, icon: CheckCircle, color: "text-[#22c55e]", bg: "bg-[#22c55e]/10 border-[#22c55e]/20", onClick: () => go({ name: "jobs" }) },
    { label: "Outstanding Invoices", value: stats.outstanding, sub: fmtMoney(outstandingTotal), icon: DollarSign, color: "text-red-300", bg: "bg-red-400/10 border-red-400/20", onClick: () => go({ name: "invoices" }) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Dashboard</h1>
        <p className="mt-1.5 text-sm text-white/45">Your portfolio at a glance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map(({ label, value, sub, icon: Icon, color, bg, onClick }) => (
          <button key={label} onClick={onClick} className={`text-left bg-white/[0.04] border rounded-2xl p-5 hover:bg-white/[0.06] transition-colors ${bg}`}>
            <div className="flex items-center justify-between mb-3">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-3xl font-black text-white">{value}</p>
            <p className="text-xs text-white/50 mt-1">{label}</p>
            {sub && <p className="text-xs text-white/35 mt-0.5">{sub}</p>}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Recent Activity</h3>
          <button onClick={() => go({ name: "jobs" })} className="text-sm text-[#22c55e] font-semibold hover:underline flex items-center gap-1">
            View all jobs <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <Card>
          {recent.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No jobs yet" subtitle="New requests will appear here." />
          ) : (
            <div className="divide-y divide-white/5">
              {recent.map((job) => (
                <button key={job.id} onClick={() => go({ name: "job", id: job.id })} className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-colors text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-4 h-4 text-white/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{job.properties?.name ?? "Unknown property"}</p>
                    <p className="text-xs text-white/40 truncate">{job.unit || "\u2014"} &middot; {job.description || "No description"}</p>
                  </div>
                  <div className="hidden sm:block text-xs text-white/35">{timeAgo(job.created_at)}</div>
                  <StatusBadge status={job.status} />
                  <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ───────────────────────── PROPERTIES LIST ───────────────────────── */

function PropertiesView({ go }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [props, setProps] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("properties").select("*, jobs(count)").order("name");
        if (error) throw error;
        setProps((data ?? []).map((p) => ({ ...p, job_count: p.jobs?.[0]?.count ?? 0 })));
      } catch (e) {
        setError(e.message ?? "Failed to load properties");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <SectionHeader title="Properties" subtitle="Your managed properties and their recent jobs." />
      {props.length === 0 ? (
        <Card><EmptyState icon={Building2} title="No properties yet" /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {props.map((p) => (
            <button key={p.id} onClick={() => go({ name: "property", id: p.id })} className="text-left bg-white/[0.04] border border-white/8 rounded-2xl p-5 hover:border-[#22c55e]/40 hover:bg-white/[0.06] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#22c55e]" />
                </div>
                <span className="text-xs text-white/35">{p.job_count} jobs</span>
              </div>
              <h3 className="font-bold text-white">{p.name}</h3>
              <p className="text-sm text-white/45 mt-1 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/30" />
                {p.address}
              </p>
              {p.primary_contact_name && (
                <p className="text-xs text-white/35 mt-2 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> {p.primary_contact_name}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── PROPERTY DETAIL ───────────────────────── */

function PropertyDetail({ id, go }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prop, setProp] = useState(null);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [pR, jR] = await Promise.all([
          supabase.from("properties").select("*").eq("id", id).maybeSingle(),
          supabase.from("jobs").select("*, properties(*)").eq("property_id", id).order("created_at", { ascending: false }),
        ]);
        if (pR.error || jR.error) throw new Error("Failed to load property");
        setProp(pR.data);
        setJobs(jR.data ?? []);
      } catch (e) {
        setError(e.message ?? "Failed to load property");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!prop) return <EmptyState icon={Building2} title="Property not found" />;

  return (
    <div className="space-y-6">
      <button onClick={() => go({ name: "properties" })} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Properties
      </button>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center shrink-0">
          <Building2 className="w-6 h-6 text-[#22c55e]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">{prop.name}</h1>
          <p className="text-sm text-white/45 mt-1 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-white/30" /> {prop.address}
          </p>
        </div>
      </div>

      {(prop.primary_contact_name || prop.primary_contact_phone || prop.primary_contact_email) && (
        <Card className="p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3">Primary Contact</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <ContactItem icon={User} label="Name" value={prop.primary_contact_name} />
            <ContactItem icon={Phone} label="Phone" value={prop.primary_contact_phone} />
            <ContactItem icon={Mail} label="Email" value={prop.primary_contact_email} />
          </div>
          {prop.notes && (
            <>
              <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mt-5 mb-2">Access Notes</p>
              <p className="text-sm text-white/60 leading-relaxed">{prop.notes}</p>
            </>
          )}
        </Card>
      )}

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Recent Jobs</h3>
        {jobs.length === 0 ? (
          <Card><EmptyState icon={ClipboardList} title="No jobs for this property" /></Card>
        ) : (
          <Card>
            <div className="divide-y divide-white/5">
              {jobs.map((job) => (
                <button key={job.id} onClick={() => go({ name: "job", id: job.id })} className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{job.unit || "No unit"}</p>
                    <p className="text-xs text-white/40 truncate">{job.description || "\u2014"}</p>
                  </div>
                  <StatusBadge status={job.status} />
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ContactItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-white/35">{label}</p>
        <p className="text-sm text-white/80">{value || "\u2014"}</p>
      </div>
    </div>
  );
}

/* ───────────────────────── JOBS LIST ───────────────────────── */

function JobsView({ go }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("jobs").select("*, properties(*)").order("created_at", { ascending: false });
        if (error) throw error;
        setJobs(data ?? []);
      } catch (e) {
        setError(e.message ?? "Failed to load jobs");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
  const filters = ["all", "open", "scheduled", "in_progress", "completed", "cancelled"];

  return (
    <div className="space-y-6">
      <SectionHeader title="Jobs" subtitle="Every work order across your portfolio." />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filter === f ? "bg-white text-black border-white" : "bg-white/5 text-white/50 border-white/10 hover:text-white"
            }`}
          >
            {f === "all" ? "All" : STATUS_META[f].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={ClipboardList} title="No jobs match this filter" /></Card>
      ) : (
        <Card>
          <div className="divide-y divide-white/5">
            {filtered.map((job) => (
              <button key={job.id} onClick={() => go({ name: "job", id: job.id })} className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-colors text-left">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-4 h-4 text-white/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {job.properties?.name ?? "Unknown"} {job.unit ? `\u00B7 ${job.unit}` : ""}
                  </p>
                  <p className="text-xs text-white/40 truncate">{job.description || "No description"}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/35">
                    {job.scheduled_date && <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {fmtDate(job.scheduled_date)}</span>}
                    {job.estimate != null && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {fmtMoney(job.estimate)}</span>}
                  </div>
                </div>
                <StatusBadge status={job.status} />
                <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ───────────────────────── JOB DETAIL ───────────────────────── */

function JobDetail({ id, go }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [job, setJob] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [jR, pR, iR] = await Promise.all([
          supabase.from("jobs").select("*, properties(*)").eq("id", id).maybeSingle(),
          supabase.from("job_photos").select("*").eq("job_id", id).order("created_at", { ascending: true }),
          supabase.from("invoices").select("*").eq("job_id", id).maybeSingle(),
        ]);
        if (jR.error || pR.error || iR.error) throw new Error("Failed to load job");
        setJob(jR.data);
        setPhotos(pR.data ?? []);
        setInvoice(iR.data);
      } catch (e) {
        setError(e.message ?? "Failed to load job");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!job) return <EmptyState icon={ClipboardList} title="Job not found" />;

  const beforePhotos = photos.filter((p) => p.kind === "before");
  const afterPhotos = photos.filter((p) => p.kind === "after");

  return (
    <div className="space-y-6">
      <button onClick={() => go({ name: "jobs" })} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Jobs
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-black text-white">{job.properties?.name ?? "Unknown property"}</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-sm text-white/45">{job.unit || "No unit specified"}</p>
        </div>
        <button onClick={() => go({ name: "new-request" })} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm px-4 py-2.5 rounded-full transition-colors self-start">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <DetailCard icon={Building2} label="Property" value={job.properties?.name ?? "\u2014"} />
        <DetailCard icon={MapPin} label="Unit / Location" value={job.unit || "\u2014"} />
        <DetailCard icon={CalendarClock} label="Scheduled" value={fmtDateTime(job.scheduled_date)} />
        <DetailCard icon={CheckCircle} label="Completed" value={fmtDateTime(job.completed_at)} />
      </div>

      {job.description && (
        <Card className="p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">Description</p>
          <p className="text-sm text-white/75 leading-relaxed">{job.description}</p>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">Estimate</p>
          <p className="text-2xl font-black text-white">{fmtMoney(job.estimate)}</p>
          {job.final_amount != null && job.final_amount !== job.estimate && (
            <p className="text-xs text-white/40 mt-1">Final: {fmtMoney(job.final_amount)}</p>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">Related Invoice</p>
          {invoice ? (
            <button onClick={() => go({ name: "invoices" })} className="flex items-center justify-between w-full">
              <div className="text-left">
                <p className="text-sm font-bold text-white">{invoice.invoice_number}</p>
                <p className="text-xs text-white/40">{fmtMoney(invoice.amount)} &middot; due {fmtDate(invoice.due_date)}</p>
              </div>
              <InvoiceBadge status={invoice.status} />
            </button>
          ) : (
            <p className="text-sm text-white/35">No invoice yet</p>
          )}
        </Card>
      </div>

      {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
        <div>
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#22c55e]" /> Documentation Photos
          </h3>
          {beforePhotos.length > 0 && <PhotoGrid label="Before" photos={beforePhotos} />}
          {afterPhotos.length > 0 && (
            <div className={beforePhotos.length > 0 ? "mt-4" : ""}>
              <PhotoGrid label="After" photos={afterPhotos} />
            </div>
          )}
        </div>
      )}

      {(job.items_removed || job.completion_notes) && (
        <Card className="p-5 space-y-4">
          {job.items_removed && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">Items Removed</p>
              <p className="text-sm text-white/75 leading-relaxed">{job.items_removed}</p>
            </div>
          )}
          {job.completion_notes && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">Completion Notes</p>
              <p className="text-sm text-white/75 leading-relaxed">{job.completion_notes}</p>
            </div>
          )}
        </Card>
      )}

      {job.access_notes && (
        <Card className="p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">Access Notes</p>
          <p className="text-sm text-white/75 leading-relaxed">{job.access_notes}</p>
        </Card>
      )}
    </div>
  );
}

function DetailCard({ icon: Icon, label, value }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-[#22c55e]" />
        <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">{label}</p>
      </div>
      <p className="text-sm text-white/85 font-medium">{value}</p>
    </Card>
  );
}

function PhotoGrid({ label, photos }) {
  const [lightbox, setLightbox] = useState(null);
  return (
    <div>
      <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <button key={photo.id} onClick={() => setLightbox(photo)} className="group relative aspect-square rounded-xl overflow-hidden bg-[#0d1410] border border-white/8 hover:border-[#22c55e]/40 transition-colors">
            <img src={photo.storage_path} alt={photo.caption || label} className="w-full h-full object-cover" />
            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-[10px] text-white/80 truncate">{photo.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>
      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 cursor-pointer">
          <div className="max-w-3xl max-h-[85vh]">
            <img src={lightbox.storage_path} alt={lightbox.caption || ""} className="max-w-full max-h-[85vh] rounded-xl object-contain" />
            {lightbox.caption && <p className="text-center text-sm text-white/70 mt-3">{lightbox.caption}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── INVOICES ───────────────────────── */

function InvoicesView({ go }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("invoices").select("*, properties(*), jobs(*)").order("created_at", { ascending: false });
        if (error) throw error;
        setInvoices(data ?? []);
      } catch (e) {
        setError(e.message ?? "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  const filtered = filter === "all" ? invoices : invoices.filter((i) => i.status === filter);
  const filters = ["all", "outstanding", "paid", "overdue", "draft"];
  const totalOutstanding = invoices
    .filter((i) => i.status === "outstanding" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-6">
      <SectionHeader title="Invoices" subtitle="Download PDFs and track what's owed." />

      {totalOutstanding > 0 && (
        <Card className="p-5 border-amber-400/20 bg-amber-400/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Outstanding balance</p>
              <p className="text-2xl font-black text-amber-300">{fmtMoney(totalOutstanding)}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filter === f ? "bg-white text-black border-white" : "bg-white/5 text-white/50 border-white/10 hover:text-white"
            }`}
          >
            {f === "all" ? "All" : INVOICE_STATUS_META[f].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={Receipt} title="No invoices match this filter" /></Card>
      ) : (
        <Card>
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8 text-xs text-white/40 uppercase tracking-wider">
                  <th className="text-left font-semibold px-5 py-3">Invoice</th>
                  <th className="text-left font-semibold px-5 py-3">Property</th>
                  <th className="text-left font-semibold px-5 py-3">Amount</th>
                  <th className="text-left font-semibold px-5 py-3">Due</th>
                  <th className="text-left font-semibold px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-white">{inv.invoice_number}</td>
                    <td className="px-5 py-4 text-sm text-white/60">{inv.properties?.name ?? "\u2014"}</td>
                    <td className="px-5 py-4 text-sm font-bold text-white">{fmtMoney(inv.amount)}</td>
                    <td className="px-5 py-4 text-sm text-white/60">{fmtDate(inv.due_date)}</td>
                    <td className="px-5 py-4"><InvoiceBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-white/5">
            {filtered.map((inv) => (
              <div key={inv.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{inv.invoice_number}</p>
                  <InvoiceBadge status={inv.status} />
                </div>
                <p className="text-xs text-white/45">{inv.properties?.name ?? "\u2014"}</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-black text-white">{fmtMoney(inv.amount)}</p>
                  <p className="text-xs text-white/40">Due {fmtDate(inv.due_date)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ───────────────────────── NEW REQUEST ───────────────────────── */

function NewRequest({ go }) {
  const [props, setProps] = useState([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ property_id: "", unit: "", description: "", preferred_date: "", access_notes: "" });

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("properties").select("*").order("name");
        if (error) throw error;
        setProps(data ?? []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingProps(false);
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.property_id) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase.from("jobs").insert({
        property_id: form.property_id,
        unit: form.unit || null,
        description: form.description || null,
        preferred_date: form.preferred_date ? new Date(form.preferred_date).toISOString() : null,
        access_notes: form.access_notes || null,
        status: "open",
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (e) {
      setError(e.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProps) return <Spinner />;

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-[#22c55e]" />
        </div>
        <h2 className="text-2xl font-black text-white">Request received</h2>
        <p className="text-sm text-white/50 mt-2 max-w-sm mx-auto">
          Our account manager will review your request and send an estimate within one business day.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button
            onClick={() => { setSubmitted(false); setForm({ property_id: "", unit: "", description: "", preferred_date: "", access_notes: "" }); }}
            className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-sm px-6 py-3 rounded-full transition-colors"
          >
            Submit Another
          </button>
          <button
            onClick={() => go({ name: "dashboard" })}
            className="border border-white/15 hover:border-white/30 text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => go({ name: "dashboard" })} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </button>

      <SectionHeader title="New Service Request" subtitle="Tell us what needs removal and we'll send an estimate." />

      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 text-sm text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <FormField label="Property" required>
          <select
            required
            value={form.property_id}
            onChange={(e) => setForm({ ...form, property_id: e.target.value })}
            className="w-full bg-transparent text-sm text-white outline-none [&>option]:bg-[#0d1410]"
          >
            <option value="">Select a property...</option>
            {props.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </FormField>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Unit or area">
            <input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="Bldg 4 · #212"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
            />
          </FormField>
          <FormField label="Preferred date">
            <input
              type="date"
              value={form.preferred_date}
              onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
              className="w-full bg-transparent text-sm text-white outline-none [&::-webkit-calendar-picker-indicator]:invert"
            />
          </FormField>
        </div>

        <FormField label="What needs removal" required>
          <textarea
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g. Tenant move-out cleanout — furniture, mattresses, household trash"
            rows={3}
            className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none resize-none"
          />
        </FormField>

        <FormField label="Access notes">
          <textarea
            value={form.access_notes}
            onChange={(e) => setForm({ ...form, access_notes: e.target.value })}
            placeholder="Gate codes, lockbox numbers, on-site contact, time windows..."
            rows={2}
            className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none resize-none"
          />
        </FormField>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-base py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          {submitting ? "Submitting..." : <>Submit Request <ArrowRight className="w-4 h-4" /></>}
        </button>
        <p className="text-center text-xs text-white/30">
          You'll receive an estimate before any work begins. No approval = no charges.
        </p>
      </form>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <label className="block space-y-2">
      <span className="block text-xs text-white/50 font-medium uppercase tracking-wider">
        {label}{required && <span className="text-[#22c55e]"> *</span>}
      </span>
      <div className="flex items-start gap-3 bg-[#111a14] border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#22c55e]/40 transition-colors">
        {children}
      </div>
    </label>
  );
}

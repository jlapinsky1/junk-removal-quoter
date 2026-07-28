import React, { useState, useEffect } from 'react';
import { getRepo } from '../utils/repository';
import AdminLogin from './AdminLogin';
import ConnectionStatus from '../components/dispatch/ConnectionStatus';
import NextJobCard from '../components/dispatch/NextJobCard';
import TodayJobsList from '../components/dispatch/TodayJobsList';
import DispatchJobDetail from '../components/dispatch/DispatchJobDetail';

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
}

export default function DispatchPage() {
  const [user, setUser]             = useState(undefined); // undefined = loading
  const [jobs, setJobs]             = useState([]);
  const [nextJobId, setNextJobId]   = useState(null);
  const [todayDate, setTodayDate]   = useState(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError]   = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [toast, setToast]           = useState(null);

  // Auth: mirrors AdminDashboard pattern
  useEffect(() => {
    let unsub;
    (async () => {
      const repo = await getRepo();
      const session = await repo.getSession();
      setUser(session || null);

      if (repo.onAuthStateChange) {
        const { data } = repo.onAuthStateChange(u => setUser(u || null));
        unsub = data?.subscription;
      }
    })();
    return () => unsub?.unsubscribe?.();
  }, []);

  // Load today's jobs whenever user is authenticated
  useEffect(() => {
    if (user) loadJobs();
  }, [user]);

  async function loadJobs() {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const repo = await getRepo();
      const data = await repo.getDispatchJobsToday();
      setJobs(data.jobs ?? []);
      setNextJobId(data.nextJobId ?? null);
      setTodayDate(data.date ?? null);
    } catch (err) {
      setJobsError(err.message || 'Failed to load jobs');
    } finally {
      setJobsLoading(false);
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleStatusAction(jobId, currentStatus) {
    const NEXT = {
      scheduled: 'en_route',
      en_route:  'arrived',
      arrived:   'in_progress',
    };
    const targetStatus = NEXT[currentStatus];
    if (!targetStatus) return;

    setStatusLoading(true);
    try {
      const repo = await getRepo();
      await repo.updateDispatchStatus(jobId, targetStatus, `${jobId}-${targetStatus}`);
      await loadJobs();
      showToast(`Status updated: ${targetStatus.replace('_', ' ')}`);
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setStatusLoading(false);
    }
  }

  // ── Auth states ──────────────────────────────────────────────────────────
  if (user === undefined) return <LoadingSpinner />;

  if (!user) {
    return (
      <AdminLogin
        onLogin={async () => {
          const repo = await getRepo();
          const session = await repo.getSession();
          setUser(session);
        }}
      />
    );
  }

  // ── Job detail view ──────────────────────────────────────────────────────
  if (selectedJobId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ConnectionStatus />
        <DispatchJobDetail
          bookingId={selectedJobId}
          onBack={() => {
            setSelectedJobId(null);
            loadJobs();
          }}
          onJobCompleted={() => {
            loadJobs();
          }}
        />
      </div>
    );
  }

  // ── Home / today's schedule ──────────────────────────────────────────────
  const nextJob = nextJobId ? jobs.find(j => j.id === nextJobId) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <ConnectionStatus />

      {/* Dispatch header */}
      <div className="bg-gray-900 text-white px-4 py-4 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <a href="/admin" className="text-xs text-gray-400 hover:text-white">← Admin</a>
          <h1 className="text-base font-bold">Squatterz Dispatch</h1>
          <button
            onClick={loadJobs}
            disabled={jobsLoading}
            className="text-xs text-gray-400 hover:text-white disabled:opacity-50"
          >
            {jobsLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {todayDate && (
          <p className="text-center text-xs text-gray-400 mt-1">
            {new Date(todayDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {jobsError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-red-700 font-medium mb-3">{jobsError}</p>
            <button onClick={loadJobs} className="text-sm text-blue-600 font-semibold">Try again</button>
          </div>
        ) : (
          <>
            <NextJobCard
              job={nextJob}
              onStatusAction={handleStatusAction}
              onSelectJob={setSelectedJobId}
              statusLoading={statusLoading}
            />
            <TodayJobsList
              jobs={jobs}
              nextJobId={nextJobId}
              onSelectJob={setSelectedJobId}
            />
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-4 right-4 mx-auto max-w-sm rounded-xl px-4 py-3 text-white text-sm font-semibold shadow-lg z-50 text-center
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-700'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

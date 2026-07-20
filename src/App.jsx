import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import QuoteForm from './pages/QuoteForm';
import QuoteHistory from './pages/QuoteHistory';
import Settings from './pages/Settings';
import RequestQueue from './pages/RequestQueue';
import Dashboard from './pages/Dashboard';
import LearningDashboard from './pages/LearningDashboard';
import BookingFlow from './pages/BookingFlow';
import ApprovedQuote from './pages/ApprovedQuote';
import AdminLogin from './pages/AdminLogin';
import { getSettings } from './utils/storage';
import { getRepo } from './utils/repository';

function AdminDashboard() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState(getSettings);
  const [duplicateData, setDuplicateData] = useState(null);

  useEffect(() => {
    let unsub;
    (async () => {
      const repo = await getRepo();
      const session = await repo.getSession();
      setUser(session || null);

      if (repo.onAuthStateChange) {
        const { data } = repo.onAuthStateChange((u) => setUser(u || null));
        unsub = data?.subscription;
      }
    })();
    return () => unsub?.unsubscribe?.();
  }, []);

  async function handleSignOut() {
    const repo = await getRepo();
    await repo.signOut();
    setUser(null);
  }

  function handleDuplicate(formData) {
    setDuplicateData(formData);
    setActiveTab('quote');
  }

  useEffect(() => {
    if (duplicateData && activeTab === 'quote') {
      const timer = setTimeout(() => setDuplicateData(null), 100);
      return () => clearTimeout(timer);
    }
  }, [duplicateData, activeTab]);

  // Loading state
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <AdminLogin onLogin={() => getRepo().then(r => r.getSession()).then(s => setUser(s))} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} onSignOut={handleSignOut} />
      <main className={`mx-auto px-4 py-4 ${
        ['dashboard', 'learning'].includes(activeTab) ? 'max-w-5xl' : 'max-w-lg'
      }`}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'requests' && <RequestQueue />}
        {activeTab === 'quote' && (
          <QuoteForm
            key={duplicateData ? Date.now() : 'form'}
            settings={settings}
            initialData={duplicateData}
          />
        )}
        {activeTab === 'history' && (
          <QuoteHistory onDuplicate={handleDuplicate} />
        )}
        {activeTab === 'learning' && <LearningDashboard />}
        {activeTab === 'settings' && (
          <Settings settings={settings} onSettingsChange={setSettings} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BookingFlow />} />
      <Route path="/book" element={<BookingFlow />} />
      <Route path="/quote/:id" element={<ApprovedQuote />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}

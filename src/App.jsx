import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import QuoteForm from './pages/QuoteForm';
import QuoteHistory from './pages/QuoteHistory';
import Settings from './pages/Settings';
import RequestQueue from './pages/RequestQueue';
import BookingFlow from './pages/BookingFlow';
import ApprovedQuote from './pages/ApprovedQuote';
import { getSettings } from './utils/storage';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('requests');
  const [settings, setSettings] = useState(getSettings);
  const [duplicateData, setDuplicateData] = useState(null);

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

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-lg mx-auto px-4 py-4">
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

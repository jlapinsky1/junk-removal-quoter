import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import QuoteForm from './pages/QuoteForm';
import QuoteHistory from './pages/QuoteHistory';
import Settings from './pages/Settings';
import { getSettings } from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState('quote');
  const [settings, setSettings] = useState(getSettings);
  const [duplicateData, setDuplicateData] = useState(null);

  function handleDuplicate(formData) {
    setDuplicateData(formData);
    setActiveTab('quote');
  }

  // Clear duplicate data after it's consumed
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

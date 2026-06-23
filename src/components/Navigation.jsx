import React from 'react';

const tabs = [
  { id: 'quote', label: 'New Quote' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
];

export default function Navigation({ activeTab, onTabChange }) {
  return (
    <nav className="no-print bg-gray-900 text-white sticky top-0 z-50">
      <div className="max-w-lg mx-auto px-4 py-3">
        <h1 className="text-lg font-bold text-center mb-2">Junk Removal Quoter</h1>
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

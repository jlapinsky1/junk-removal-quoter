import React from 'react';

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'requests', label: 'Requests' },
  { id: 'quote', label: 'New Quote' },
  { id: 'history', label: 'History' },
  { id: 'learning', label: 'Learning' },
  { id: 'service-area', label: 'Service Area' },
  { id: 'settings', label: 'Settings' },
];

export default function Navigation({ activeTab, onTabChange, onSignOut }) {
  return (
    <nav className="no-print bg-gray-900 text-white sticky top-0 z-50">
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div />
          <h1 className="text-lg font-bold">Junk Removal Admin</h1>
          {onSignOut ? (
            <button onClick={onSignOut} className="text-xs text-gray-400 hover:text-white">
              Sign out
            </button>
          ) : <div />}
        </div>
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
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

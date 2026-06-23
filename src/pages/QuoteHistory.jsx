import React, { useState, useEffect } from 'react';
import { getQuotes, deleteQuote } from '../utils/storage';

const statusColors = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

export default function QuoteHistory({ onDuplicate }) {
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    setQuotes(getQuotes());
  }, []);

  function handleDelete(id) {
    if (!confirm('Delete this quote?')) return;
    deleteQuote(id);
    setQuotes(getQuotes());
  }

  function handleDuplicate(quote) {
    const { id, createdAt, suggestedQuote, estimatedMargin, profitabilityStatus, ...formData } = quote;
    onDuplicate(formData);
  }

  if (quotes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">No saved quotes yet</p>
        <p className="text-sm mt-1">Create a quote to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      <h2 className="font-bold text-gray-800">Quote History ({quotes.length})</h2>

      {quotes.map(quote => (
        <div key={quote.id} className="bg-white rounded-xl border p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${statusColors[quote.profitabilityStatus] || 'bg-gray-400'}`} />
                <span className="font-bold text-lg">${quote.suggestedQuote}</span>
                <span className="text-xs text-gray-400">
                  {quote.estimatedMargin ? `${(quote.estimatedMargin * 100).toFixed(0)}%` : ''}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-700 mt-1">{quote.customerName || 'No name'}</div>
              <div className="text-xs text-gray-500 truncate">{quote.jobAddress || 'No address'}</div>
              <div className="text-xs text-gray-400 mt-1">
                {quote.loadSize} &middot; {new Date(quote.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleDuplicate(quote)}
              className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-medium"
            >
              Duplicate
            </button>
            <button
              onClick={() => handleDelete(quote.id)}
              className="flex-1 bg-red-50 text-red-700 py-2 rounded-lg text-sm font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

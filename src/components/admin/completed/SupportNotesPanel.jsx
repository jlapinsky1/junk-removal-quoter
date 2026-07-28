import React, { useState } from 'react';
import { getRepo } from '../../../utils/repository';

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function SupportNotesPanel({ bookingId, initialNotes = [] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleAddNote() {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    setError(null);
    try {
      const repo = await getRepo();
      const result = await repo.addSupportNote(bookingId, text);
      setNotes(prev => [...prev, result.note]);
      setDraft('');
    } catch (e) {
      setError(e.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Add note */}
      <div className="space-y-2">
        <textarea
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="Add an internal support note…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          disabled={saving}
        />
        {error && (
          <div className="text-xs text-red-600">{error}</div>
        )}
        <button
          onClick={handleAddNote}
          disabled={saving || !draft.trim()}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {saving ? 'Saving…' : 'Add Note'}
        </button>
      </div>

      {/* Existing notes */}
      {notes.length === 0 ? (
        <div className="text-sm text-gray-400">No support notes yet.</div>
      ) : (
        <div className="space-y-3">
          {notes.map((note, i) => (
            <div key={note.id || i} className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{note.noteText}</div>
              <div className="text-xs text-gray-400">
                {note.adminEmail || 'Admin'} · {formatDateTime(note.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

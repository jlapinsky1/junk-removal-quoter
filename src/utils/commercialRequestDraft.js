export const DRAFT_STORAGE_KEY = 'squatterz_commercial_request_draft';

export function emptyDraft(attribution = {}) {
  return {
    version: 1,
    idempotencyKey: crypto.randomUUID(),
    uploadSessionId: null,
    photoPreviews: [],
    propName: '',
    propStreet: '',
    propCity: '',
    propState: 'GA',
    propZip: '',
    propType: '',
    propUnits: '',
    propContactName: '',
    propContactPhone: '',
    propNotes: '',
    jobUnit: '',
    jobService: '',
    jobDescription: '',
    jobDate: '',
    jobAccessNotes: '',
    jobPoRef: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    pendingLogin: false,
    attribution,
  };
}

export function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveDraft(draft) {
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function buildPropertyAddress(draft) {
  return [draft.propStreet, draft.propCity, draft.propState, draft.propZip]
    .filter(Boolean)
    .join(', ');
}

export function buildJobDescriptionText(draft) {
  return [draft.jobService, draft.jobDescription].filter(Boolean).join(' — ');
}

export function buildAccessNotesText(draft) {
  return [
    draft.jobAccessNotes,
    draft.jobPoRef ? `PO/Ref: ${draft.jobPoRef}` : null,
  ].filter(Boolean).join('\n') || null;
}

export function buildPropertyNotesText(draft) {
  return [
    draft.propType ? `Type: ${draft.propType}` : null,
    draft.propUnits ? `Units: ${draft.propUnits}` : null,
    draft.propNotes || null,
  ].filter(Boolean).join('\n') || null;
}

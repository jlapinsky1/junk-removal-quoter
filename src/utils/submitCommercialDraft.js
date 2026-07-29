import {
  buildPropertyAddress,
  buildPropertyNotesText,
  buildJobDescriptionText,
  buildAccessNotesText,
  clearDraft,
  loadDraft,
  isSubmittableDraft,
} from './commercialRequestDraft';

/**
 * Submit a saved draft for an already-authenticated commercial client.
 */
export async function submitAuthenticatedDraft(supabase, draft) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data: client, error: clientErr } = await supabase
    .from('commercial_clients')
    .select('id')
    .eq('user_id', session.user.id)
    .single();

  if (clientErr || !client) throw new Error('Commercial profile not found');

  if (draft.idempotencyKey) {
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('id, property_id')
      .eq('idempotency_key', draft.idempotencyKey)
      .maybeSingle();

    if (existingJob) {
      await supabase
        .from('commercial_clients')
        .update({ onboarding_status: 'complete', last_onboarding_step: 3 })
        .eq('id', client.id);

      clearDraft();
      return {
        jobId: existingJob.id,
        propertyId: existingJob.property_id,
        clientId: client.id,
      };
    }
  }

  const { data: prop, error: propErr } = await supabase
    .from('properties')
    .insert({
      client_id: client.id,
      name: draft.propName,
      address: buildPropertyAddress(draft),
      primary_contact_name: draft.propContactName || null,
      primary_contact_phone: draft.propContactPhone || null,
      notes: buildPropertyNotesText(draft),
    })
    .select('id')
    .single();

  if (propErr || !prop) throw new Error('Failed to save property');

  const res = await fetch('/api/create-commercial-job', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      propertyId: prop.id,
      unit: draft.jobUnit || null,
      description: buildJobDescriptionText(draft),
      preferredDate: draft.jobDate || null,
      accessNotes: buildAccessNotesText(draft),
      uploadSessionId: draft.uploadSessionId || null,
      idempotencyKey: draft.idempotencyKey || null,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit request');

  await supabase
    .from('commercial_clients')
    .update({ onboarding_status: 'complete', last_onboarding_step: 3 })
    .eq('id', client.id);

  clearDraft();
  return { jobId: data.jobId, propertyId: prop.id, clientId: client.id };
}

/**
 * If sessionStorage holds a complete draft for the logged-in user, submit it.
 */
export async function trySubmitSavedDraft(supabase) {
  const draft = loadDraft();
  if (!isSubmittableDraft(draft)) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.email) return null;

  const draftEmail = draft.email.trim().toLowerCase();
  const sessionEmail = session.user.email.trim().toLowerCase();
  if (draftEmail !== sessionEmail) return null;

  return submitAuthenticatedDraft(supabase, draft);
}

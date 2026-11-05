// Cloudflare Pages Functions: GET/POST /api/requests
// Request records may reference a branch, but branch deletion never depends on them.

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, branch_id, source, status, patient_name, phone,
              preferred_language, care_type, gender_preference, required_skill,
              zone, location, latitude, longitude, requested_date,
              preferred_start, preferred_end, notes, service_amount_cents,
              caregiver_payment_cents, created_at, updated_at
       FROM requests ORDER BY created_at DESC`
    ).all();
    return Response.json(results);
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 }); }

  const {
    source, branch_id, patient_name, phone, preferred_language, care_type,
    gender_preference, required_skill, zone, location, latitude, longitude,
    requested_date, preferred_start, preferred_end, notes,
  } = body;
  if (!patient_name || !requested_date || !preferred_start || !preferred_end) {
    return Response.json({
      ok: false,
      error: 'patient_name, requested_date, preferred_start, and preferred_end are required.',
    }, { status: 400 });
  }

  try {
    const maxRow = await env.DB.prepare('SELECT id FROM requests ORDER BY id DESC LIMIT 1').first();
    const lastNum = maxRow ? parseInt(maxRow.id.replace(/\D/g, ''), 10) : 1000;
    const prefix = source === 'WhatsApp' ? 'WA-REQ-' : 'WEB-REQ-';
    const id = `${prefix}${lastNum + 1}`;
    await env.DB.prepare(
      `INSERT INTO requests
        (id, branch_id, source, status, patient_name, phone, preferred_language, care_type,
         gender_preference, required_skill, zone, location, latitude, longitude,
         requested_date, preferred_start, preferred_end, notes)
       VALUES (?, ?, ?, 'New', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, branch_id || null, source || 'Website', patient_name, phone || null,
      preferred_language || null, care_type || 'General Care',
      gender_preference || 'No preference', required_skill || null,
      zone || '', location || '', latitude ?? null, longitude ?? null,
      requested_date, preferred_start, preferred_end, notes || null
    ).run();
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

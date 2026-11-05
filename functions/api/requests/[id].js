// Cloudflare Pages Functions: GET/PUT /api/requests/:id

const SELECT_REQUEST = `
  SELECT id, branch_id, source, status, patient_name, phone,
         preferred_language, care_type, gender_preference, required_skill,
         zone, location, latitude, longitude, requested_date,
         preferred_start, preferred_end, notes, service_amount_cents,
         caregiver_payment_cents, created_at, updated_at
  FROM requests`;

export async function onRequestGet({ env, params }) {
  try {
    const row = await env.DB.prepare(`${SELECT_REQUEST} WHERE id = ?`).bind(params.id).first();
    if (!row) return Response.json({ ok: false, error: 'Request not found.' }, { status: 404 });
    return Response.json(row);
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function onRequestPut({ request, env, params }) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 }); }

  const allowed = [
    'status', 'branch_id', 'patient_name', 'phone', 'preferred_language',
    'care_type', 'gender_preference', 'required_skill', 'zone', 'location',
    'latitude', 'longitude', 'requested_date', 'preferred_start',
    'preferred_end', 'notes', 'service_amount_cents', 'caregiver_payment_cents',
  ];
  const fields = allowed.filter((field) => body[field] !== undefined);
  if (!fields.length) return Response.json({ ok: false, error: 'No fields to update.' }, { status: 400 });

  const sets = fields.map((field) => `${field} = ?`);
  const values = fields.map((field) => field === 'branch_id' ? (body[field] || null) : body[field]);
  sets.push("updated_at = datetime('now')");
  try {
    const result = await env.DB.prepare(
      `UPDATE requests SET ${sets.join(', ')} WHERE id = ?`
    ).bind(...values, params.id).run();
    if (!result.meta || result.meta.changes === 0) {
      return Response.json({ ok: false, error: 'Request not found.' }, { status: 404 });
    }
    return Response.json({ ok: true, id: params.id });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

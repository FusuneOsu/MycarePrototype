// Cloudflare Pages Function: GET /api/bookings
// Requires the D1 binding named DB (see wrangler.toml).
// Returns booking records — requests that have already been assigned to a
// caregiver — joined with the caregiver's name for display.

export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(
    `SELECT b.id, b.patient_name, b.date, b.start_time, b.end_time, b.duration_mins, b.location, b.address,
            b.branch_id, b.branch_name,
            b.service_type, b.status, b.rate_cents, b.cost_breakdown, b.appointment_type, b.booking_type,
            b.caregiver_gender_preference, b.location_mode, b.tasks, b.special_instructions,
            c.name AS caregiver_name,
            b.invoice_pdf, b.stripe_checkout_url, b.receipt_url, b.payment_method, b.paid_at
     FROM bookings b
     JOIN caregivers c ON c.id = b.caregiver_id
     ORDER BY b.date DESC, b.start_time DESC`
  ).all();

  return Response.json(results);
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 }); }

  const {
    request_id, branch_id, caregiver_id, caregiver_name, patient_name,
    date, start_time, end_time, duration_mins, location, address,
    latitude, longitude, service_type, status, appointment_type, booking_type,
    caregiver_gender_preference, location_mode, tasks, special_instructions, rate_cents,
  } = body;
  if (!patient_name || !caregiver_id || !date || !start_time || !end_time) {
    return Response.json({
      ok: false,
      error: 'patient_name, caregiver_id, date, start_time, and end_time are required.',
    }, { status: 400 });
  }

  try {
    const requestRow = request_id
      ? await env.DB.prepare('SELECT branch_id FROM requests WHERE id = ?').bind(request_id).first()
      : null;
    const effectiveBranchId = branch_id ?? requestRow?.branch_id ?? null;
    const caregiverRow = await env.DB.prepare('SELECT name FROM caregivers WHERE id = ?').bind(caregiver_id).first();
    if (!caregiverRow) return Response.json({ ok: false, error: 'Caregiver not found.' }, { status: 404 });

    const maxRow = await env.DB.prepare('SELECT id FROM bookings ORDER BY id DESC LIMIT 1').first();
    const lastNum = maxRow ? parseInt(maxRow.id.replace(/\D/g, ''), 10) : 5000;
    const id = `BK-${lastNum + 1}`;
    const taskList = Array.isArray(tasks) ? JSON.stringify(tasks) : (tasks || '[]');
    const duration = duration_mins || (() => {
      const [sh, sm] = start_time.split(':').map(Number);
      const [eh, em] = end_time.split(':').map(Number);
      return Math.max((eh * 60 + em) - (sh * 60 + sm), 0);
    })();
    const statusValue = status || 'Caregiver assigned';
    let branchName = null;
    if (effectiveBranchId && ['Completed', 'Service completed'].includes(statusValue)) {
      branchName = (await env.DB.prepare('SELECT name FROM branches WHERE id = ?').bind(effectiveBranchId).first())?.name || null;
    }

    await env.DB.prepare(
      `INSERT INTO bookings
        (id, request_id, branch_id, branch_name, patient_name, caregiver_id, caregiver_name,
         date, start_time, end_time, duration_mins, location, address, latitude, longitude,
         service_type, status, appointment_type, booking_type, caregiver_gender_preference,
         location_mode, tasks, special_instructions, rate_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, request_id || null, effectiveBranchId, branchName, patient_name, caregiver_id,
      caregiver_name || caregiverRow.name, date, start_time, end_time, duration,
      location || address || '', address || location || '', latitude ?? null, longitude ?? null,
      service_type || 'General Care', statusValue, appointment_type || 'Home Visit',
      booking_type || 'One time', caregiver_gender_preference || 'No preference',
      location_mode || 'address', taskList, special_instructions || '', rate_cents || 0
    ).run();

    if (request_id) {
      await env.DB.prepare("UPDATE requests SET status = 'Booked', updated_at = datetime('now') WHERE id = ?").bind(request_id).run();
    }
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

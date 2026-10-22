// Cloudflare Pages Function: GET /api/appointments, POST /api/appointments
// Requires the D1 binding named DB (see wrangler.toml).
//
// The standalone appointments table has been merged into bookings. This
// function reads/writes the bookings table but exposes the appointment
// shape the frontend (AppointmentsPage) expects.

export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(
    `SELECT b.id, NULL AS patient_id, b.patient_name, b.caregiver_id, b.caregiver_name,
            b.date, b.start_time, b.end_time, b.status,
            b.appointment_type, b.booking_type,
            b.caregiver_gender_preference, b.location_mode, b.location AS location_text,
            b.latitude, b.longitude, b.tasks, b.special_instructions, b.duration_mins
     FROM bookings b
     ORDER BY b.date DESC, b.start_time ASC`
  ).all();

  // Parse tasks JSON string into array for each row
  const parsed = results.map((row) => ({
    ...row,
    tasks: row.tasks ? JSON.parse(row.tasks) : [],
  }));

  return Response.json(parsed);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const {
    _patient_id, patient_name, caregiver_id, caregiver_name,
    date, start_time, end_time, status, appointment_type, booking_type,
    caregiver_gender_preference, location_mode, location_text,
    latitude, longitude, tasks, special_instructions, duration_mins,
  } = body;

  if (!patient_name || !date || !start_time || !end_time) {
    return Response.json(
      { ok: false, error: 'patient_name, date, start_time, and end_time are required.' },
      { status: 400 }
    );
  }

  // Generate a new booking ID (BK-xxxxx)
  const maxResult = await env.DB.prepare(
    `SELECT id FROM bookings ORDER BY id DESC LIMIT 1`
  ).first();

  const lastNum = maxResult ? parseInt(maxResult.id.replace(/\D/g, ''), 10) : 5000;
  const newId = `BK-${String(lastNum + 1)}`;

  const tasksJson = tasks ? JSON.stringify(tasks) : '[]';
  const calcDuration = duration_mins || (() => {
    const [sh, sm] = start_time.split(':').map(Number);
    const [eh, em] = end_time.split(':').map(Number);
    return Math.max((eh * 60 + em) - (sh * 60 + sm), 0);
  })();

  await env.DB.prepare(
    `INSERT INTO bookings
     (id, patient_name, caregiver_id, caregiver_name,
      date, start_time, end_time, status, appointment_type, booking_type,
      caregiver_gender_preference, location_mode, location,
      latitude, longitude, tasks, special_instructions, duration_mins,
      service_type, rate_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    newId, patient_name, caregiver_id || null, caregiver_name || null,
    date, start_time, end_time, status || 'Scheduled', appointment_type || 'Home Visit',
    booking_type || 'One time', caregiver_gender_preference || 'No preference',
    location_mode || 'address', location_text || '',
    latitude || null, longitude || null,
    tasksJson, special_instructions || '', calcDuration,
    appointment_type || 'Home Visit', 0
  ).run();

  return Response.json({ ok: true, id: newId }, { status: 201 });
}

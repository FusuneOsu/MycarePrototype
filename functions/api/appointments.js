// Cloudflare Pages Function: GET /api/appointments, POST /api/appointments
// Requires the D1 binding named DB (see wrangler.toml).
// Returns appointment records with caregiver and patient info.

export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(
    `SELECT a.id, a.patient_id, a.patient_name, a.caregiver_id, a.caregiver_name,
            a.date, a.start_time, a.end_time, a.status,
            a.appointment_type, a.booking_type,
            a.caregiver_gender_preference, a.location_mode, a.location_text,
            a.latitude, a.longitude, a.tasks, a.special_instructions, a.duration_mins
     FROM appointments a
     ORDER BY a.date DESC, a.start_time ASC`
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
    patient_id, patient_name, caregiver_id, caregiver_name,
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

  // Generate a new appointment ID
  const maxResult = await env.DB.prepare(
    `SELECT id FROM appointments ORDER BY id DESC LIMIT 1`
  ).first();

  const lastNum = maxResult ? parseInt(maxResult.id.replace(/\D/g, ''), 10) : 3000;
  const newId = `AP-${String(lastNum + 1)}`;

  const tasksJson = tasks ? JSON.stringify(tasks) : '[]';
  const calcDuration = duration_mins || (() => {
    const [sh, sm] = start_time.split(':').map(Number);
    const [eh, em] = end_time.split(':').map(Number);
    return Math.max((eh * 60 + em) - (sh * 60 + sm), 0);
  })();

  await env.DB.prepare(
    `INSERT INTO appointments
     (id, patient_id, patient_name, caregiver_id, caregiver_name,
      date, start_time, end_time, status, appointment_type, booking_type,
      caregiver_gender_preference, location_mode, location_text,
      latitude, longitude, tasks, special_instructions, duration_mins)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    newId, patient_id || null, patient_name, caregiver_id || null, caregiver_name || null,
    date, start_time, end_time, status || 'Scheduled', appointment_type || 'Home Visit',
    booking_type || 'One time', caregiver_gender_preference || 'No preference',
    location_mode || 'address', location_text || '',
    latitude || null, longitude || null,
    tasksJson, special_instructions || '', calcDuration
  ).run();

  return Response.json({ ok: true, id: newId }, { status: 201 });
}

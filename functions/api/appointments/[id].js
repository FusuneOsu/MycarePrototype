// Cloudflare Pages Function: PUT /api/appointments/:id
// Updates an existing appointment. Requires the D1 binding named DB.

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const appointmentId = params.id;

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

  // Build SET clause dynamically
  const sets = [];
  const values = [];

  if (patient_id !== undefined) { sets.push('patient_id = ?'); values.push(patient_id || null); }
  if (patient_name !== undefined) { sets.push('patient_name = ?'); values.push(patient_name); }
  if (caregiver_id !== undefined) { sets.push('caregiver_id = ?'); values.push(caregiver_id || null); }
  if (caregiver_name !== undefined) { sets.push('caregiver_name = ?'); values.push(caregiver_name || null); }
  if (date !== undefined) { sets.push('date = ?'); values.push(date); }
  if (start_time !== undefined) { sets.push('start_time = ?'); values.push(start_time); }
  if (end_time !== undefined) { sets.push('end_time = ?'); values.push(end_time); }
  if (status !== undefined) { sets.push('status = ?'); values.push(status); }
  if (appointment_type !== undefined) { sets.push('appointment_type = ?'); values.push(appointment_type); }
  if (booking_type !== undefined) { sets.push('booking_type = ?'); values.push(booking_type); }
  if (caregiver_gender_preference !== undefined) { sets.push('caregiver_gender_preference = ?'); values.push(caregiver_gender_preference); }
  if (location_mode !== undefined) { sets.push('location_mode = ?'); values.push(location_mode); }
  if (location_text !== undefined) { sets.push('location_text = ?'); values.push(location_text); }
  if (latitude !== undefined) { sets.push('latitude = ?'); values.push(latitude || null); }
  if (longitude !== undefined) { sets.push('longitude = ?'); values.push(longitude || null); }
  if (tasks !== undefined) { sets.push('tasks = ?'); values.push(JSON.stringify(tasks)); }
  if (special_instructions !== undefined) { sets.push('special_instructions = ?'); values.push(special_instructions); }
  if (duration_mins !== undefined) { sets.push('duration_mins = ?'); values.push(duration_mins); }

  if (sets.length === 0) {
    return Response.json({ ok: false, error: 'No fields to update.' }, { status: 400 });
  }

  sets.push("updated_at = datetime('now')");
  values.push(appointmentId);

  const result = await env.DB.prepare(
    `UPDATE appointments SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  if (!result.meta || result.meta.changes === 0) {
    return Response.json({ ok: false, error: 'Appointment not found.' }, { status: 404 });
  }

  return Response.json({ ok: true, id: appointmentId });
}

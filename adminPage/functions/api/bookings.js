// Cloudflare Pages Function: GET /api/bookings
// Requires the D1 binding named DB (see wrangler.toml).
// Returns booking records — requests that have already been assigned to a
// caregiver — joined with the caregiver's name for display.

export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(
    `SELECT b.id, b.patient_name, b.date, b.start_time, b.end_time, b.duration_mins, b.location,
            b.service_type, b.status, b.rate_cents, b.appointment_type, b.booking_type,
            b.caregiver_gender_preference, b.location_mode, b.tasks, b.special_instructions,
            c.name AS caregiver_name
     FROM bookings b
     JOIN caregivers c ON c.id = b.caregiver_id
     ORDER BY b.date DESC, b.start_time DESC`
  ).all();

  return Response.json(results);
}

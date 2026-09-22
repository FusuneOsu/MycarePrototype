// Cloudflare Pages Function: GET /api/bookings
// Requires the D1 binding named DB (see wrangler.toml).
// Returns booking records — requests that have already been assigned to a
// caregiver — joined with the caregiver's name for display.

export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(
    `SELECT b.id, b.patient_name, b.scheduled_at, b.duration_mins, b.location,
            b.service_type, b.status, b.rate_cents, c.name AS caregiver_name
     FROM bookings b
     JOIN caregivers c ON c.id = b.caregiver_id
     ORDER BY b.scheduled_at DESC`
  ).all();

  return Response.json(results);
}

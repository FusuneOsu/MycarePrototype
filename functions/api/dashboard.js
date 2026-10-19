// Cloudflare Pages Function: GET /api/dashboard
// Requires the D1 binding named DB (see wrangler.toml).
// Returns aggregated dashboard metrics from bookings, caregivers, and requests tables.

export async function onRequestGet(context) {
  const { env } = context;

  try {
    // 1. Bookings aggregation
    const { results: bookings } = await env.DB.prepare(
      `SELECT id, date, status, rate_cents, service_type, caregiver_name,
              caregiver_id, appointment_type
       FROM bookings
       ORDER BY date DESC`
    ).all();

    // 2. Caregiver availability
    const { results: caregivers } = await env.DB.prepare(
      `SELECT id, name, gender, center, availability
       FROM caregivers
       ORDER BY name`
    ).all();

    // 3. Request sources (WhatsApp vs Website)
    const { results: requests } = await env.DB.prepare(
      `SELECT source FROM requests`
    ).all();

    // 4. Application pipeline count
    const pendingApps = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM applications
       WHERE status IN ('Submitted', 'Under review', 'More info needed')`
    ).first();

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return Response.json({
      bookings,
      caregivers,
      requests,
      pendingApplications: pendingApps?.count || 0,
      generatedAt: today,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

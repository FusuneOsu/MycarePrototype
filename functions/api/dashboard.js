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

    // 2. Caregiver availability (with skills aggregated from the join table)
    const { results: caregivers } = await env.DB.prepare(
      `SELECT c.id, c.name, c.gender, c.center, c.availability,
              COALESCE(
                json_group_array(cs.skill) FILTER (WHERE cs.skill IS NOT NULL),
                '[]'
              ) AS skills
       FROM caregivers c
       LEFT JOIN caregiver_skills cs ON cs.caregiver_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
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

    // Parse skills JSON string → array for each caregiver
    const parsedCaregivers = caregivers.map((c) => ({
      ...c,
      skills: typeof c.skills === 'string' ? JSON.parse(c.skills) : c.skills,
    }));

    return Response.json({
      bookings,
      caregivers: parsedCaregivers,
      requests,
      pendingApplications: pendingApps?.count || 0,
      generatedAt: today,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

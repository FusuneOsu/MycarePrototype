// Compatibility alias for the existing Requests site selector.
// New clients should use GET /api/branches?status=active.

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, name, service_area AS area, latitude, longitude, address, phone
     FROM branches WHERE status = 'active' ORDER BY service_area`
  ).all();
  return Response.json(results);
}

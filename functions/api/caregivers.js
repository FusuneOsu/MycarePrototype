// Cloudflare Pages Function: GET /api/caregivers
// Requires the D1 binding named DB (see wrangler.toml). Returns the joined
// branch name, or "Unassigned" when branch_id is null. Supports ?branch_id=.

export async function onRequestGet(context) {
  const { env, request } = context;
  const branchId = new URL(request.url).searchParams.get('branch_id');

  const query = `SELECT c.id, c.name, c.gender,
                        COALESCE(b.name, 'Unassigned') AS center, c.branch_id, c.availability
                 FROM caregivers c
                 LEFT JOIN branches b ON b.id = c.branch_id
                 ${branchId ? 'WHERE c.branch_id = ?' : ''}
                 ORDER BY c.name`;
  const { results } = await env.DB.prepare(query).bind(...(branchId ? [branchId] : [])).all();

  return Response.json(results);
}

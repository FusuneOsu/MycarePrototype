// Cloudflare Pages Function: GET /api/caregivers
// Available once this project is deployed to Pages with the D1 binding
// named DB (see wrangler.toml). Not called by the UI yet — CaregiversPage
// still reads src/data/mockCaregivers.js. Point fetchCaregivers() at
// '/api/caregivers' when you're ready to go live with real data.

export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(
    'SELECT id, name, gender, center, availability FROM caregivers ORDER BY name'
  ).all();

  return Response.json(results);
}

// Cloudflare Pages Function
// Available at: /api/hello
// Binds to the D1 database configured as "DB" in wrangler.toml

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB
      .prepare("SELECT id, message, created_at FROM greetings ORDER BY id DESC")
      .all();

    return Response.json({ ok: true, greetings: results });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return Response.json(
        { ok: false, error: "Body must be JSON: { \"message\": \"...\" }" },
        { status: 400 }
      );
    }

    const result = await env.DB
      .prepare("INSERT INTO greetings (message) VALUES (?) RETURNING id, message, created_at")
      .bind(message)
      .first();

    return Response.json({ ok: true, greeting: result }, { status: 201 });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

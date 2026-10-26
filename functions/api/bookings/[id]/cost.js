// Cloudflare Pages Function: PUT /api/bookings/:id/cost
// Updates the cost_breakdown JSON for a booking.
// Requires the D1 binding named DB (see wrangler.toml).

export async function onRequestPut(context) {
  const { env, params } = context;
  const bookingId = params.id;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const costBreakdown = body.cost_breakdown;
  if (costBreakdown === undefined || costBreakdown === null) {
    return Response.json({ ok: false, error: 'cost_breakdown is required.' }, { status: 400 });
  }

  try {
    const { success } = await env.DB.prepare(
      `UPDATE bookings SET cost_breakdown = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(costBreakdown, bookingId).run();

    if (!success) {
      return Response.json({ ok: false, error: 'Booking not found.' }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

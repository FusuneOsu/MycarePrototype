// Cloudflare Pages Function: POST /api/bookings/:id/collect
// Called when an admin/caregiver marks a booking as paid outside Stripe
// (cash, DuitNow QR, bank transfer, etc). Expects a data: URL of the
// uploaded receipt (image or PDF) captured directly from the patient.
// Requires the D1 binding named DB.

export async function onRequestPost(context) {
  const { request, env, params } = context;
  const bookingId = params.id;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const receiptDataUrl = typeof body.receiptDataUrl === 'string' ? body.receiptDataUrl : null;
  if (!receiptDataUrl) {
    return Response.json({ ok: false, error: 'A receipt file is required to mark a booking as collected directly.' }, { status: 400 });
  }

  const result = await env.DB.prepare(
    `UPDATE bookings
     SET status = 'Paid - Collected Directly', receipt_url = ?, payment_method = 'direct',
         paid_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`
  ).bind(receiptDataUrl, bookingId).run();

  if (!result.meta || result.meta.changes === 0) {
    return Response.json({ ok: false, error: 'Booking not found.' }, { status: 404 });
  }

  return Response.json({ ok: true });
}

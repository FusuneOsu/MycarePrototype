// Cloudflare Pages Function: POST /api/bookings/:id/pay-link
// Called when a caregiver/admin clicks "Generate payment link" on a booking
// whose status is "Service completed". Stores the client-generated invoice
// PDF, creates a Stripe Checkout Session for the booking amount, and moves
// the booking to "Link sent (Unpaid)".
//
// Requires the D1 binding named DB and the STRIPE_SECRET_KEY secret
// (see wrangler.toml / `npx wrangler secret put STRIPE_SECRET_KEY`).

const stripeEndpoint = 'https://api.stripe.com/v1/checkout/sessions';

function formBody(values) {
  return new URLSearchParams(values).toString();
}

export async function onRequestPost(context) {
  const { request, env, params } = context;
  const bookingId = params.id;

  const booking = await env.DB.prepare(
    `SELECT b.id, b.patient_name, b.service_type, b.rate_cents, b.status
     FROM bookings b WHERE b.id = ?`
  ).bind(bookingId).first();

  if (!booking) {
    return Response.json({ ok: false, error: 'Booking not found.' }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const invoicePdf = typeof body.invoicePdf === 'string' ? body.invoicePdf : null;

  if (!env.STRIPE_SECRET_KEY) {
    // Demo mode: still record the invoice and move the booking to "Link sent"
    // so the rest of the UI flow can be exercised without a Stripe key.
    await env.DB.prepare(
      `UPDATE bookings SET status = 'Link sent (Unpaid)', invoice_pdf = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(invoicePdf, bookingId).run();

    return Response.json({
      ok: true,
      demo: true,
      message: 'Stripe is not configured. Add STRIPE_SECRET_KEY to create a real Stripe test link.',
    });
  }

  const origin = new URL(request.url).origin;
  const stripeResponse = await fetch(stripeEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody({
      mode: 'payment',
      success_url: `${origin}/bookings?payment=success&booking=${encodeURIComponent(bookingId)}`,
      cancel_url: `${origin}/bookings?payment=cancelled&booking=${encodeURIComponent(bookingId)}`,
      'line_items[0][price_data][currency]': 'myr',
      'line_items[0][price_data][product_data][name]': `${booking.service_type} for ${booking.patient_name}`,
      'line_items[0][price_data][unit_amount]': String(booking.rate_cents),
      'line_items[0][quantity]': '1',
      'metadata[booking_id]': bookingId,
      // Checkout always collects the payer's email, and Stripe emails a
      // receipt after payment if "email customers on successful payments"
      // is enabled in the Stripe Dashboard (Settings > Customer emails).
    }),
  });

  const result = await stripeResponse.json();
  if (!stripeResponse.ok) {
    return Response.json({ ok: false, error: result.error?.message || 'Stripe checkout creation failed.' }, { status: 502 });
  }

  await env.DB.prepare(
    `UPDATE bookings
     SET status = 'Link sent (Unpaid)', invoice_pdf = ?, stripe_session_id = ?, stripe_checkout_url = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(invoicePdf, result.id, result.url, bookingId).run();

  return Response.json({ ok: true, demo: false, checkoutUrl: result.url, sessionId: result.id });
}

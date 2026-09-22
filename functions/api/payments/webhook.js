// Cloudflare Pages Function: POST /api/payments/webhook
// Stripe calls this after checkout events. Verifies the Stripe-Signature
// header using STRIPE_WEBHOOK_SECRET, then on checkout.session.completed
// looks up the Stripe hosted receipt and marks the matching booking
// "Paid - Online".
//
// Configure in the Stripe Dashboard: Developers > Webhooks > add endpoint
// pointing at https://<your-pages-domain>/api/payments/webhook, listening
// for the checkout.session.completed event. Copy the signing secret it
// gives you into `npx wrangler secret put STRIPE_WEBHOOK_SECRET`.

async function verifyStripeSignature(payload, signatureHeader, secret) {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => part.split('=').map((piece) => piece.trim()))
  );
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const computed = Array.from(new Uint8Array(signatureBytes)).map((b) => b.toString(16).padStart(2, '0')).join('');

  if (computed.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i += 1) mismatch |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

async function fetchReceiptUrl(paymentIntentId, secretKey) {
  if (!paymentIntentId) return null;
  const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}?expand[]=latest_charge`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!response.ok) return null;
  const paymentIntent = await response.json();
  return paymentIntent.latest_charge?.receipt_url || null;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const payload = await request.text();

  if (env.STRIPE_WEBHOOK_SECRET) {
    const signature = request.headers.get('stripe-signature');
    const valid = await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      return Response.json({ ok: false, error: 'Invalid Stripe signature.' }, { status: 400 });
    }
  }

  const event = JSON.parse(payload);

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object;
    const bookingId = session?.metadata?.booking_id;
    if (!bookingId) {
      return Response.json({ ok: true, ignored: true, reason: 'No booking_id in metadata.' });
    }

    const receiptUrl = env.STRIPE_SECRET_KEY
      ? await fetchReceiptUrl(session.payment_intent, env.STRIPE_SECRET_KEY)
      : null;

    await env.DB.prepare(
      `UPDATE bookings
       SET status = 'Paid - Online', receipt_url = ?, payment_method = 'stripe',
           paid_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? OR stripe_session_id = ?`
    ).bind(receiptUrl, bookingId, session.id).run();

    return Response.json({ ok: true, bookingId, status: 'Paid - Online' });
  }

  return Response.json({ ok: true, ignored: true, type: event.type });
}

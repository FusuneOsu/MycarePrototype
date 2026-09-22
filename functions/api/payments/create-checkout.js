const stripeEndpoint = 'https://api.stripe.com/v1/checkout/sessions';

function formBody(values) {
  return new URLSearchParams(values).toString();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.STRIPE_SECRET_KEY) {
    return Response.json({
      ok: true,
      demo: true,
      message: 'Stripe is not configured. Use Stripe test keys to create a real checkout link.',
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const amount = Number(body.amountCents);
  if (!Number.isInteger(amount) || amount <= 0) {
    return Response.json({ ok: false, error: 'amountCents must be a positive integer.' }, { status: 400 });
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
      success_url: `${origin}/requests/${encodeURIComponent(body.requestId)}?payment=success`,
      cancel_url: `${origin}/requests/${encodeURIComponent(body.requestId)}?payment=cancelled`,
      'line_items[0][price_data][currency]': body.currency || 'myr',
      'line_items[0][price_data][product_data][name]': body.description || 'Caregiver service',
      'line_items[0][price_data][unit_amount]': String(amount),
      'line_items[0][quantity]': '1',
      'metadata[request_id]': body.requestId || '',
      'metadata[patient_id]': body.patientId || '',
    }),
  });

  const result = await stripeResponse.json();
  if (!stripeResponse.ok) {
    return Response.json({ ok: false, error: result.error?.message || 'Stripe checkout creation failed.' }, { status: 502 });
  }

  return Response.json({ ok: true, demo: false, checkoutUrl: result.url, sessionId: result.id });
}

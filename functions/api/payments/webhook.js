export async function onRequestPost(context) {
  const { request } = context;
  const event = await request.json();

  // Stripe should call this endpoint after payment. Persist event.type and
  // event.data.object.metadata.request_id in D1 when the database workflow is enabled.
  if (event.type === 'checkout.session.completed') {
    return Response.json({ ok: true, requestId: event.data?.object?.metadata?.request_id || null, status: 'Payment received' });
  }

  return Response.json({ ok: true, ignored: true, type: event.type });
}

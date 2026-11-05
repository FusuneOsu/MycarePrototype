async function request(path, options) {
  const response = await fetch(path, options);
  let result;
  try { result = await response.json(); } catch { result = null; }
  if (!response.ok || result?.ok === false) {
    const error = new Error(result?.error || `Price slate request failed (${response.status}).`);
    error.status = response.status;
    error.payload = result;
    throw error;
  }
  return result;
}

export async function fetchPriceSlate(bookingId) {
  const result = await request(`/api/bookings/${encodeURIComponent(bookingId)}/price-slate`);
  return result.slate;
}

export async function savePriceSlate(bookingId, items) {
  return request(`/api/bookings/${encodeURIComponent(bookingId)}/price-slate`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
}

export async function fetchPriceTemplates() {
  return request('/api/price-templates');
}

export async function createPriceTemplate(name, items) {
  return request('/api/price-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, items }),
  });
}

export function deletePriceTemplate(id) {
  return request(`/api/price-templates/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

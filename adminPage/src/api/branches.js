async function request(path, options) {
  const response = await fetch(path, options);
  let result;
  try { result = await response.json(); } catch { result = null; }
  if (!response.ok) {
    const error = new Error(result?.error || `Branch request failed (${response.status}).`);
    error.status = response.status;
    error.payload = result;
    throw error;
  }
  return result;
}

export function fetchBranches({ search = '', status = '' } = {}) {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  if (status) params.set('status', status);
  const query = params.toString();
  return request(`/api/branches${query ? `?${query}` : ''}`);
}

export function fetchBranch(id) {
  return request(`/api/branches/${encodeURIComponent(id)}`);
}

export function createBranch(branch) {
  return request('/api/branches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(branch),
  });
}

export function updateBranch(id, changes) {
  return request(`/api/branches/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
}

export function deleteBranch(id) {
  return request(`/api/branches/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

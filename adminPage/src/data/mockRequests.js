// mockRequests.js — Dummy data removed. All requests come from database API.

export const mockRequests = [];

export function getRequestById(id) {
  return mockRequests.find((item) => item.id === id) || null;
}

const STORAGE_PREFIX = 'mycare.patientRequest.';

export function getRequestStorageKey(id) {
  return `${STORAGE_PREFIX}${id}`;
}

export function readRequestOverrides(id) {
  try {
    return JSON.parse(window.localStorage.getItem(getRequestStorageKey(id)) || '{}');
  } catch {
    return {};
  }
}

export function writeRequestOverrides(id, patch) {
  const next = { ...readRequestOverrides(id), ...patch };
  window.localStorage.setItem(getRequestStorageKey(id), JSON.stringify(next));
  return next;
}

export function getEffectiveRequest(id) {
  const base = getRequestById(id);
  if (!base) return null;
  return {
    ...base,
    ...readRequestOverrides(id),
  };
}

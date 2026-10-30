// mockPatients.js — Dummy data removed. Fetches live data from PostgreSQL API.

export const mockPatients = [];

export async function fetchPatients() {
  try {
    const res = await fetch('/api/patients');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('[fetchPatients] error:', err.message);
  }
  return [];
}

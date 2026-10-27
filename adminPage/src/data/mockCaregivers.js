// mockCaregivers.js — Dummy data removed. Fetches live data from PostgreSQL API.

export const mockCaregivers = [];

/** Helper to derive caregiver email if missing. */
export const caregiverEmail = (caregiver) => caregiver.email || `${caregiver.username || caregiver.id?.toLowerCase()}@mycaregivers.com`;

/**
 * Fetch live caregivers from the database via REST API.
 * @returns {Promise<Array>} Array of real caregiver objects.
 */
export async function fetchCaregivers() {
  try {
    const res = await fetch('/api/caregivers');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('[fetchCaregivers] API error:', err.message);
  }
  return [];
}

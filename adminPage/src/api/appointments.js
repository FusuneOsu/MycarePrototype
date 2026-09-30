/**
 * Appointments API — REST client for fetching, creating, and updating
 * appointments. Calls the Pages Function endpoints (/api/appointments).
 *
 * In local dev these are served by the Vite middleware (vite.config.js);
 * in production they are served by Cloudflare Pages Functions backed by D1.
 */

/**
 * Fetch all appointments from the server.
 * @returns {Promise<Array>} Array of appointment objects.
 */
export async function fetchAppointments() {
  const response = await fetch('/api/appointments');
  if (!response.ok) {
    throw new Error(`Failed to fetch appointments: ${response.status}`);
  }
  return response.json();
}

/**
 * Create a new appointment.
 * @param {Object} appointment - Appointment data.
 * @returns {Promise<Object>} Response with { ok, id }.
 */
export async function createAppointment(appointment) {
  const response = await fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointment),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `Failed to create appointment: ${response.status}`);
  }
  return result;
}

/**
 * Update an existing appointment.
 * @param {string} id - Appointment ID (e.g. 'AP-3001').
 * @param {Object} updates - Partial appointment fields to update.
 * @returns {Promise<Object>} Response with { ok, id }.
 */
export async function updateAppointment(id, updates) {
  const response = await fetch(`/api/appointments/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `Failed to update appointment: ${response.status}`);
  }
  return result;
}

export const BRANCH_DELETE_BLOCKING_STATUSES = [
  'Caregiver assigned',
  'Scheduled',
  'In progress',
  'No caregiver assigned',
];

export const BRANCH_FIELDS = [
  'name', 'address', 'city', 'state', 'postcode', 'service_area',
  'latitude', 'longitude', 'phone', 'email', 'operating_hours',
  'capacity', 'status', 'notes', 'emergency_contact_name',
  'emergency_contact_phone', 'facility_fee_cents',
];

const MALAYSIAN_PHONE = /^(?:60|\+60)(?:1[0-9]\d{7,8}|[3-9]\d{7,8})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function parseOperatingHours(value) {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

export function isValidMalaysianPhone(value) {
  if (!value) return true;
  const digits = String(value).trim().replace(/[\s().-]/g, '');
  return MALAYSIAN_PHONE.test(digits);
}

export function normalizeBranchInput(input = {}, existing = null) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
  const merged = { ...existing };
  for (const field of BRANCH_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) merged[field] = input[field];
  }

  merged.name = typeof merged.name === 'string' ? merged.name.trim() : '';
  for (const field of ['address', 'city', 'state', 'postcode', 'service_area', 'phone', 'email', 'notes', 'emergency_contact_name', 'emergency_contact_phone']) {
    if (merged[field] !== undefined && merged[field] !== null) merged[field] = String(merged[field]).trim();
  }
  merged.latitude = merged.latitude === '' || merged.latitude == null ? null : Number(merged.latitude);
  merged.longitude = merged.longitude === '' || merged.longitude == null ? null : Number(merged.longitude);
  merged.capacity = merged.capacity === '' || merged.capacity == null ? 350 : Number(merged.capacity);
  merged.facility_fee_cents = merged.facility_fee_cents === '' || merged.facility_fee_cents == null
    ? 0
    : Number(merged.facility_fee_cents);
  merged.status = String(merged.status || 'active').toLowerCase();
  if (merged.operating_hours === undefined || merged.operating_hours === null || merged.operating_hours === '') {
    merged.operating_hours = { open: '07:00', close: '23:00' };
  } else {
    merged.operating_hours = parseOperatingHours(merged.operating_hours);
  }
  return merged;
}

export function validateBranch(branch) {
  const errors = {};
  for (const field of ['name', 'address', 'city', 'state', 'postcode', 'service_area']) {
    if (!branch[field]) errors[field] = 'This field is required.';
  }
  if (branch.latitude == null || !Number.isFinite(branch.latitude) || branch.latitude < -90 || branch.latitude > 90) {
    errors.latitude = 'Latitude must be a number between -90 and 90.';
  }
  if (branch.longitude == null || !Number.isFinite(branch.longitude) || branch.longitude < -180 || branch.longitude > 180) {
    errors.longitude = 'Longitude must be a number between -180 and 180.';
  }
  if (!Number.isInteger(branch.capacity) || branch.capacity < 0) errors.capacity = 'Capacity must be a non-negative integer.';
  if (!Number.isInteger(branch.facility_fee_cents) || branch.facility_fee_cents < 0) {
    errors.facility_fee_cents = 'Facility fee must be a non-negative integer in cents.';
  }
  if (!['active', 'inactive'].includes(branch.status)) errors.status = 'Status must be active or inactive.';
  if (!isValidMalaysianPhone(branch.phone)) errors.phone = 'Enter a valid Malaysian phone number.';
  if (!isValidMalaysianPhone(branch.emergency_contact_phone)) errors.emergency_contact_phone = 'Enter a valid Malaysian phone number.';
  if (branch.email && !EMAIL.test(branch.email)) errors.email = 'Enter a valid email address.';

  const hours = branch.operating_hours;
  if (!hours || !TIME.test(String(hours.open || '')) || !TIME.test(String(hours.close || ''))) {
    errors.operating_hours = 'Operating hours must contain open and close times in HH:MM format.';
  }
  return errors;
}

export function branchResponse(row) {
  if (!row) return row;
  const branch = { ...row };
  if (typeof branch.operating_hours === 'string') {
    try { branch.operating_hours = JSON.parse(branch.operating_hours); } catch { branch.operating_hours = null; }
  }
  branch.caregiver_count = Number(branch.caregiver_count || 0);
  branch.ongoing_appointment_count = Number(branch.ongoing_appointment_count || 0);
  return branch;
}

export async function makeBranchAudit({ action, recordId, summary, changes, previousHash = null }) {
  const id = `AUD-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const at = new Date().toISOString();
  const content = JSON.stringify({ id, at, action, recordId, summary, changes, previousHash });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return { id, at, action, recordId: String(recordId), summary, changes, previousHash, hash };
}

export function auditChanges(before, after) {
  return [{ field: 'record', before: before ?? null, after: after ?? null }];
}

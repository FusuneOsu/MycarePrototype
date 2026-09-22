// Placeholder data shaped like the future `patient_requests` D1 table
// (see db/schema.sql). Swap the reads below for a real API call once the
// Pages Function + D1 binding is wired up.
//
// Caregiver-assignment / payment progress isn't in this array on purpose —
// it's kept per-request in localStorage (see the override helpers below) so
// the Requests page, the request detail page, and the Appointments page can
// all read/write the same state without a backend yet.

const today = new Date();

function offsetDate(days) {
  const date = new Date(today);
  date.setDate(today.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export const mockRequests = [
  {
    id: 'WA-REQ-1001', source: 'WhatsApp', status: 'New',
    patientId: 'PT-1011', patientName: 'Nur Aisyah Rahman', phone: '+60 12-345 6789', language: 'Malay',
    careType: 'Post-operative home care', genderPreference: 'Female', requiredSkill: 'Post-surgery care',
    zone: 'Petaling Jaya', location: '24 Jalan Damai, Kuala Lumpur',
    requestedDateISO: offsetDate(0), preferredStart: '10:00', preferredEnd: '12:00',
    notes: 'Needs help with mobility, medication reminders, and wound-care observation after knee surgery.',
    serviceAmount: 'RM 120.00', caregiverPayment: 'RM 90.00',
  },
  {
    id: 'WEB-REQ-1002', source: 'Website', status: 'In Review',
    patientId: 'PT-1012', patientName: 'Daniel Lim', phone: '+60 11-222 3344', language: 'English',
    careType: 'Daily home assistance', genderPreference: 'No preference', requiredSkill: 'Elderly care',
    zone: 'Subang Jaya', location: 'Subang Jaya, Selangor',
    requestedDateISO: offsetDate(1), preferredStart: '09:00', preferredEnd: '10:00',
    notes: '', serviceAmount: 'RM 90.00', caregiverPayment: 'RM 65.00',
  },
  {
    id: 'WA-REQ-0998', source: 'WhatsApp', status: 'Booked',
    patientId: 'PT-1005', patientName: 'Nadia Ismail', phone: '+60 13-987 6543', language: 'Malay',
    careType: 'Physiotherapy support', genderPreference: 'No preference', requiredSkill: 'Physiotherapy support',
    zone: 'Petaling Jaya', location: 'Petaling Jaya, Selangor',
    requestedDateISO: offsetDate(-4), preferredStart: '14:00', preferredEnd: '15:00',
    notes: '', serviceAmount: 'RM 80.00', caregiverPayment: 'RM 60.00',
  },
  {
    id: 'WEB-REQ-0995', source: 'Website', status: 'Rejected',
    patientId: 'PT-1003', patientName: 'Sofia Hassan', phone: '+60 19-555 1122', language: 'English',
    careType: 'Medication reminders', genderPreference: 'No preference', requiredSkill: 'Medication management',
    zone: 'Cheras', location: 'Cheras, Kuala Lumpur',
    requestedDateISO: offsetDate(2), preferredStart: '11:00', preferredEnd: '12:00',
    notes: '', serviceAmount: 'RM 70.00', caregiverPayment: 'RM 50.00',
  },
];

export function getRequestById(id) {
  return mockRequests.find((item) => item.id === id);
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

const DEFAULT_OVERRIDES = {
  caregiverId: '', caregiverName: '',
  assignmentStatus: 'Pending assignment',
  receiptStatus: 'Receipt pending',
  payoutStatus: 'Awaiting payment',
};

// Merges the static request with whatever's been assigned/paid so far.
export function getEffectiveRequest(id) {
  const base = getRequestById(id);
  if (!base) return null;
  return {
    ...base,
    requestedDate: formatDateLabel(base.requestedDateISO),
    preferredTime: `${base.preferredStart} - ${base.preferredEnd}`,
    ...DEFAULT_OVERRIDES,
    ...readRequestOverrides(id),
  };
}

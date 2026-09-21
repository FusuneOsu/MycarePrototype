// The caregiver application + profile-change store, shared by both apps.
//
// The admin app is served from the same origin as the caregiver app (the
// /caregiver proxy in dev, the same Pages deploy in production), so both read
// and write these keys directly. Swap the read/write pair for API calls when
// the D1 tables land — nothing above this layer needs to change.
import { COVERAGE_AREAS, LANGUAGES, SHIFTS, SPECIALISATIONS, STATES, TRAVEL_MODES, WORKING_DAYS } from './careVocabulary.js';

export const APPLICATIONS_KEY = 'mycare.caregiverApplications';
export const CHANGE_REQUESTS_KEY = 'mycare.profileChangeRequests';
const OVERLAY_KEY = 'mycare.caregiverProfiles';
const HOLDS_KEY = 'mycare.caregiverHolds';
const AVAILABILITY_KEY = 'mycare.caregiverAvailability';
const MANUAL_KEY = 'mycare.manualCaregivers';

/** Every key this store owns — used by the demo reset. */
export const STORE_KEYS = [APPLICATIONS_KEY, CHANGE_REQUESTS_KEY, OVERLAY_KEY, HOLDS_KEY, AVAILABILITY_KEY, MANUAL_KEY];

export const APPLICATION_STEPS = ['Your details', 'Experience', 'Documents', 'Review'];

export const STATUS = {
  draft: 'Draft',
  submitted: 'Submitted',
  review: 'Under review',
  moreInfo: 'More info needed',
  approved: 'Approved',
  rejected: 'Rejected',
};

/** Statuses that put an application in the admin's approval queue. */
export const OPEN_STATUSES = [STATUS.submitted, STATUS.review, STATUS.moreInfo];

// The stages an applicant sees on their status screen, in order.
export const STATUS_TIMELINE = [STATUS.submitted, STATUS.review, STATUS.approved];

export const CHANGE_STATUS = { pending: 'Pending approval', approved: 'Approved', rejected: 'Rejected' };

export const documentSlots = [
  { id: 'identity', label: 'IC or passport', hint: 'Clear photo or scan of both sides', required: true },
  { id: 'certificate', label: 'Caregiving or nursing certificate', hint: 'Your primary qualification', required: true },
  { id: 'training', label: 'Additional training certificates', hint: 'CPR, first aid, specialised care', required: false },
  { id: 'reference', label: 'Reference letter', hint: 'From a previous employer or supervisor', required: false },
];

/**
 * What a caregiver may change about themselves. Admin-owned fields
 * (caregiver ID, username, assigned center, availability, manager) are shown
 * on the profile but are deliberately absent here.
 */
export const EDITABLE_FIELDS = [
  { id: 'phone', label: 'Phone number', type: 'text', group: 'Contact', placeholder: '+60 12-345 6789' },
  { id: 'address', label: 'Home address', type: 'text', group: 'Contact', placeholder: 'Unit, street, area' },
  { id: 'postcode', label: 'Postcode', type: 'text', group: 'Contact', placeholder: '59000' },
  { id: 'city', label: 'City', type: 'text', group: 'Contact', placeholder: 'Kuala Lumpur' },
  { id: 'state', label: 'State', type: 'select', group: 'Contact', options: STATES },
  { id: 'dob', label: 'Date of birth', type: 'date', group: 'Personal details' },
  { id: 'nationality', label: 'Nationality', type: 'text', group: 'Personal details' },
  { id: 'emergencyName', label: 'Emergency contact name', type: 'text', group: 'Emergency contact' },
  { id: 'emergencyRelationship', label: 'Relationship', type: 'text', group: 'Emergency contact', placeholder: 'Sibling, parent…' },
  { id: 'emergencyPhone', label: 'Emergency contact phone', type: 'text', group: 'Emergency contact' },
  { id: 'specialisations', label: 'Specialisations', type: 'chips', group: 'Experience', options: SPECIALISATIONS },
  { id: 'languages', label: 'Languages', type: 'chips', group: 'Experience', options: LANGUAGES },
  { id: 'bio', label: 'Short introduction', type: 'textarea', group: 'Experience' },
  { id: 'coverageAreas', label: 'Coverage areas', type: 'chips', group: 'Availability', options: COVERAGE_AREAS },
  { id: 'workingDays', label: 'Working days', type: 'chips', group: 'Availability', options: WORKING_DAYS },
  { id: 'shift', label: 'Shift preference', type: 'select', group: 'Availability', options: SHIFTS },
  { id: 'travelMode', label: 'Travel mode', type: 'select', group: 'Availability', options: TRAVEL_MODES },
  { id: 'workAccommodations', label: 'Work accommodations', type: 'textarea', group: 'Availability', placeholder: 'Anything your coordinator should plan around.' },
];

/** Fields a caregiver is asked to fill in once their application is approved. */
export const REQUIRED_AFTER_APPROVAL = ['dob', 'address', 'city', 'state', 'emergencyName', 'emergencyPhone'];

export const fieldLabel = (id) => EDITABLE_FIELDS.find((field) => field.id === id)?.label || id;

export function blankApplication() {
  return {
    fullName: '', email: '', phone: '', gender: '', idNumber: '',
    experienceBand: '', previousEmployer: '', bio: '',
    specialisations: [], languages: [],
    preferredCenter: '', coverageAreas: [], workingDays: [], shift: '', travelMode: '', startDate: '',
    documents: {},
  };
}

const key = (email) => String(email || '').trim().toLowerCase();

function readStore(storeKey) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storeKey) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const writeStore = (storeKey, value) => window.localStorage.setItem(storeKey, JSON.stringify(value));

/* Applications ------------------------------------------------------------ */

export function listApplications() {
  return Object.values(readStore(APPLICATIONS_KEY)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function getApplication(email) {
  return readStore(APPLICATIONS_KEY)[key(email)] || null;
}

export function findApplicationByLogin(email, password) {
  const application = getApplication(email);
  return application && application.password === password ? application : null;
}

function nextApplicationId(applications) {
  const used = Object.values(applications).map((item) => Number(String(item.id).replace('APP-', '')) || 0);
  return `APP-${Math.max(5000, ...used) + 1}`;
}

/** Creates the record on step 1 so the applicant can leave and come back to a draft. */
export function startApplication({ fullName, email, password }) {
  const applications = readStore(APPLICATIONS_KEY);
  const existing = applications[key(email)];
  const now = new Date().toISOString();
  const application = existing
    ? { ...existing, password, updatedAt: now, data: { ...existing.data, fullName, email } }
    : {
        id: nextApplicationId(applications),
        status: STATUS.draft,
        step: 1,
        password,
        createdAt: now,
        updatedAt: now,
        submittedAt: '',
        reviewNote: '',
        assignment: null,
        data: { ...blankApplication(), fullName, email },
      };
  applications[key(email)] = application;
  writeStore(APPLICATIONS_KEY, applications);
  return application;
}

export function saveApplication(email, changes) {
  const applications = readStore(APPLICATIONS_KEY);
  const existing = applications[key(email)];
  if (!existing) return null;
  const updated = { ...existing, ...changes, updatedAt: new Date().toISOString(), data: { ...existing.data, ...changes.data } };
  applications[key(email)] = updated;
  writeStore(APPLICATIONS_KEY, applications);
  return updated;
}

/**
 * First submission, or a resubmission after the admin sent it back. On a
 * resubmission the admin's reason is kept as `previousNote`, so the reviewer
 * can see what the applicant was asked to fix.
 */
export function submitApplication(email) {
  const existing = getApplication(email);
  const now = new Date().toISOString();
  const resubmitting = existing?.status === STATUS.moreInfo;
  return saveApplication(email, {
    status: STATUS.submitted,
    step: APPLICATION_STEPS.length,
    submittedAt: resubmitting ? existing.submittedAt : now,
    resubmittedAt: resubmitting ? now : existing?.resubmittedAt || '',
    previousNote: resubmitting ? existing.reviewNote : existing?.previousNote || '',
    reviewNote: '',
  });
}

export function setApplicationStatus(email, status, reviewNote = '') {
  return saveApplication(email, { status, reviewNote });
}

/** Straight approval — the applicant's preferred center becomes their center. */
export function approveApplication(email) {
  return saveApplication(email, { status: STATUS.approved, reviewNote: '', approvedAt: new Date().toISOString() });
}

/** Not approved: sent back with a reason. The applicant can edit and resubmit. */
export function returnApplication(email, reason) {
  return saveApplication(email, { status: STATUS.moreInfo, reviewNote: reason, returnedAt: new Date().toISOString() });
}

/** Common reasons offered to the reviewer as one-click starting points. */
export const RETURN_REASONS = [
  'We need more information about your caregiving experience.',
  'A document is unclear or unreadable. Please upload a clearer copy.',
  'A certificate has expired. Please upload a current one.',
  'Your IC or passport details do not match the uploaded document.',
];

export const isApplicationComplete = (data) => [0, 1, 2].every((step) => isStepComplete(step, data));

export function isStepComplete(step, data) {
  if (step === 0) return Boolean(data.fullName.trim() && data.email.trim() && data.phone.trim() && data.gender && data.idNumber.trim());
  if (step === 1) return Boolean(data.experienceBand && data.specialisations.length && data.languages.length && data.preferredCenter && data.coverageAreas?.length && data.workingDays.length && data.shift);
  if (step === 2) return documentSlots.filter((slot) => slot.required).every((slot) => data.documents[slot.id]);
  return true;
}

/* Profile change requests -------------------------------------------------- */

export function getProfileOverlay(email) {
  return readStore(OVERLAY_KEY)[key(email)] || {};
}

export function getChangeRequest(email) {
  return readStore(CHANGE_REQUESTS_KEY)[key(email)] || null;
}

export function listChangeRequests() {
  return Object.values(readStore(CHANGE_REQUESTS_KEY)).sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
}

const same = (a, b) => (Array.isArray(a) || Array.isArray(b)
  ? JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort())
  : String(a ?? '') === String(b ?? ''));

/** Diffs the edited values against what is live and files only what actually changed. */
export function requestProfileChanges(email, current, edited) {
  const changes = {};
  EDITABLE_FIELDS.forEach(({ id }) => {
    const before = current[id] === '—' ? '' : current[id];
    if (!same(before, edited[id])) changes[id] = edited[id];
  });
  if (Object.keys(changes).length === 0) return null;

  const requests = readStore(CHANGE_REQUESTS_KEY);
  const request = {
    id: `CHG-${Date.now().toString().slice(-6)}`,
    email: key(email),
    name: current.name,
    caregiverId: current.caregiverId || '',
    status: CHANGE_STATUS.pending,
    submittedAt: new Date().toISOString(),
    reviewNote: '',
    before: Object.fromEntries(Object.keys(changes).map((id) => [id, current[id]])),
    changes,
  };
  requests[key(email)] = request;
  writeStore(CHANGE_REQUESTS_KEY, requests);
  return request;
}

export function approveProfileChanges(email) {
  const requests = readStore(CHANGE_REQUESTS_KEY);
  const request = requests[key(email)];
  if (!request) return null;

  const overlays = readStore(OVERLAY_KEY);
  overlays[key(email)] = { ...overlays[key(email)], ...request.changes };
  writeStore(OVERLAY_KEY, overlays);

  delete requests[key(email)];
  writeStore(CHANGE_REQUESTS_KEY, requests);
  return overlays[key(email)];
}

export function rejectProfileChanges(email, reviewNote = '') {
  const requests = readStore(CHANGE_REQUESTS_KEY);
  if (!requests[key(email)]) return null;
  requests[key(email)] = { ...requests[key(email)], status: CHANGE_STATUS.rejected, reviewNote };
  writeStore(CHANGE_REQUESTS_KEY, requests);
  return requests[key(email)];
}

export function dismissChangeRequest(email) {
  const requests = readStore(CHANGE_REQUESTS_KEY);
  delete requests[key(email)];
  writeStore(CHANGE_REQUESTS_KEY, requests);
}

/* Account holds (suspend / deactivate) ------------------------------------- */

/** An Active caregiver taken out of the booking pool. The record is kept. */
export function getAccountHold(email) {
  return readStore(HOLDS_KEY)[key(email)] || null;
}

export function setAccountHold(email, state, reason) {
  const holds = readStore(HOLDS_KEY);
  holds[key(email)] = { state, reason, since: new Date().toISOString() };
  writeStore(HOLDS_KEY, holds);
  return holds[key(email)];
}

export function clearAccountHold(email) {
  const holds = readStore(HOLDS_KEY);
  delete holds[key(email)];
  writeStore(HOLDS_KEY, holds);
}

/* Availability (rostering) -------------------------------------------------- */

// Persisted so an admin's availability change survives a reload — it used to
// live only in React state and was lost every time the page refetched.
export function getAvailability(email) {
  return readStore(AVAILABILITY_KEY)[key(email)] || '';
}

export function setAvailability(email, availability) {
  const map = readStore(AVAILABILITY_KEY);
  map[key(email)] = availability;
  writeStore(AVAILABILITY_KEY, map);
}

/* Caregivers the admin added by hand --------------------------------------- */

export function listManualCaregivers() {
  return Object.values(readStore(MANUAL_KEY));
}

export function saveManualCaregiver(caregiver) {
  const manual = readStore(MANUAL_KEY);
  manual[caregiver.id] = { ...caregiver, createdAt: caregiver.createdAt || new Date().toISOString() };
  writeStore(MANUAL_KEY, manual);
  return manual[caregiver.id];
}

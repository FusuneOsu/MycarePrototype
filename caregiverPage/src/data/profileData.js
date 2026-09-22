import { documentSlots, getApplication } from './applicationData.js';
import { getChangeRequest, getProfileOverlay, REQUIRED_AFTER_APPROVAL } from './profileChanges.js';
import { DEMO_CAREGIVER } from '../../../shared/demoCaregiver.js';
import { getAccountHold, getAvailability } from '../../../shared/caregiverStore.js';
import { getBookingHistory, summariseBookings } from '../../../shared/bookingHistory.js';

const initialsOf = (name) => String(name || '').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'CG';
const usernameOf = (name) => String(name || '').trim().toLowerCase().split(/\s+/).slice(0, 2).join('.');

/**
 * Fields the admin owns. A caregiver sees them on their profile but cannot edit
 * them — they are set by the coordinator at approval time. Names and values
 * match adminPage/src/data/mockCaregivers.js and the caregiver detail modal.
 */
const adminDefaults = {
  availability: 'Available',
  autoAssigned: 'No',
  // Approval no longer assigns a manager; matches caregiverAccounts.js on the admin side.
  managerName: '',
  managerId: '',
};

// Fallback profile for the pre-seeded demo caregiver, who never went through
// the wizard. Built from the same record the admin directory lists, so the two
// apps always show this person identically — see shared/demoCaregiver.js.
export const demoProfile = { ...DEMO_CAREGIVER, caregiverId: DEMO_CAREGIVER.id, status: 'Active' };

function fromApplication(application) {
  const { data } = application;
  return {
    caregiverId: application.id.replace('APP-', 'CG-'),
    username: usernameOf(data.fullName),
    name: data.fullName,
    initials: initialsOf(data.fullName),
    role: 'Caregiver',
    status: application.status,
    center: data.preferredCenter || '',
    ...adminDefaults,
    joinedOn: application.submittedAt ? new Date(application.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    email: data.email,
    phone: data.phone,
    gender: data.gender,
    idNumber: data.idNumber,
    // Not asked for during the application — collected on the profile after approval.
    dob: '', nationality: '', address: '', city: '', state: '', postcode: '',
    emergencyName: '', emergencyRelationship: '', emergencyPhone: '',
    workAccommodations: '',
    experienceBand: data.experienceBand,
    previousEmployer: data.previousEmployer,
    bio: data.bio,
    specialisations: data.specialisations,
    languages: data.languages,
    coverageAreas: data.coverageAreas || [],
    workingDays: data.workingDays,
    shift: data.shift,
    travelMode: data.travelMode,
    startDate: data.startDate,
    documents: documentSlots.map((slot) => {
      const file = data.documents[slot.id];
      const approved = application.status === 'Approved';
      return { label: slot.label, file: file ? file.name : 'Not uploaded', status: file ? (approved ? 'Verified' : 'Submitted') : 'Missing', expiry: '—' };
    }),
  };
}

/** Application data, plus any admin-approved edits on top, plus the pending request. */
export function buildProfile(account) {
  const application = account?.email ? getApplication(account.email) : null;
  const base = application ? fromApplication(application) : demoProfile;
  const profile = { ...base, ...getProfileOverlay(base.email) };
  const request = getChangeRequest(base.email);
  const hold = getAccountHold(base.email);
  const bookings = getBookingHistory(profile.caregiverId);

  return {
    ...profile,
    // Rostering and holds are set by the admin; read the same store it writes.
    availability: getAvailability(base.email) || profile.availability,
    hold,
    accountStatus: hold ? hold.state : 'Active',
    bookings,
    bookingSummary: summariseBookings(bookings),
    pendingChanges: request?.changes || null,
    pendingRequest: request,
    missingFields: REQUIRED_AFTER_APPROVAL.filter((field) => !String(profile[field] || '').trim()),
  };
}

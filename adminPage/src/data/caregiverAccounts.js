import { caregiverEmail } from './mockCaregivers.js';
import {
  documentSlots, getAccountHold, getAvailability, getChangeRequest, getProfileOverlay,
  listApplications, listManualCaregivers, OPEN_STATUSES, STATUS,
} from '../../../shared/caregiverStore.js';
import { getBookingHistory, summariseBookings } from '../../../shared/bookingHistory.js';

/**
 * Account lifecycle, separate from `availability`. A caregiver can be Active
 * and On Leave at the same time; an applicant has no availability at all.
 */
export const ACCOUNT_STATUS = {
  active: 'Active',
  pending: 'Pending approval',
  // Sent back with a reason; the applicant can edit and resubmit.
  moreInfo: 'Not approved',
  rejected: 'Rejected',
  // Admin holds on an approved caregiver — out of the booking pool, record kept.
  suspended: 'Suspended',
  deactivated: 'Deactivated',
};

/**
 * Rows the admin can act on right now — a submitted application or a profile
 * edit. A "Not approved" application is waiting on the applicant, so it is
 * deliberately excluded until they resubmit.
 */
export const isAwaitingAction = (row) =>
  row.accountStatus === ACCOUNT_STATUS.pending || Boolean(row.pendingChange);

/** Can be offered to a patient in the booking engine (Module 1). */
export const isBookable = (row) => row.accountStatus === ACCOUNT_STATUS.active;

const applicationStatusOf = (application) => {
  if (application.status === STATUS.approved) return ACCOUNT_STATUS.active;
  if (application.status === STATUS.moreInfo) return ACCOUNT_STATUS.moreInfo;
  if (application.status === STATUS.rejected) return ACCOUNT_STATUS.rejected;
  return ACCOUNT_STATUS.pending;
};

/** Holds only apply to someone already Active; they override that status. */
function withHold(row) {
  const hold = row.accountStatus === ACCOUNT_STATUS.active ? getAccountHold(row.email) : null;
  const history = getBookingHistory(row.id);
  return {
    ...row,
    hold,
    accountStatus: hold ? hold.state : row.accountStatus,
    bookings: history,
    bookingSummary: summariseBookings(history),
  };
}

function fromApplication(application) {
  const { data, assignment } = application;
  const overlay = getProfileOverlay(data.email);
  const approved = application.status === STATUS.approved;

  return withHold({
    id: application.id.replace('APP-', 'CG-'),
    name: data.fullName,
    gender: data.gender,
    center: assignment?.center || data.preferredCenter,
    availability: approved ? (getAvailability(data.email) || 'Available') : '',
    username: String(data.fullName || '').trim().toLowerCase().split(/\s+/).slice(0, 2).join('.'),
    email: data.email,
    phone: overlay.phone || data.phone,
    idNumber: data.idNumber,
    dob: overlay.dob || '',
    address: [overlay.address, overlay.postcode, overlay.city, overlay.state].filter(Boolean).join(', '),
    emergencyContact: overlay.emergencyName ? `${overlay.emergencyName} · ${overlay.emergencyPhone || ''}` : '',
    languages: overlay.languages || data.languages,
    specialisations: overlay.specialisations || data.specialisations,
    experienceBand: data.experienceBand,
    previousEmployer: data.previousEmployer,
    bio: overlay.bio || data.bio,
    coverageAreas: overlay.coverageAreas || data.coverageAreas || [],
    workingDays: overlay.workingDays || data.workingDays,
    shift: overlay.shift || data.shift,
    travelMode: overlay.travelMode || data.travelMode,
    startDate: data.startDate,
    documents: data.documents,
    documentList: documentSlots.map((slot) => {
      const file = data.documents?.[slot.id];
      return { label: slot.label, file: file ? file.name : 'Not uploaded', status: file ? (approved ? 'Verified' : 'Submitted') : 'Missing' };
    }),
    workAccommodations: overlay.workAccommodations || assignment?.workAccommodations || '',
    autoAssigned: assignment?.autoAssigned || 'No',
    managerName: assignment?.managerName || '',
    managerId: assignment?.managerId || '',
    joinedOn: application.approvedAt || application.submittedAt || '',
    accountStatus: applicationStatusOf(application),
    source: 'application',
    application,
    pendingChange: getChangeRequest(data.email),
  });
}

function fromDirectory(caregiver, source) {
  const email = caregiverEmail(caregiver);
  const overlay = getProfileOverlay(email);
  const merged = { ...caregiver, ...overlay };
  return withHold({
    ...merged,
    email,
    availability: getAvailability(email) || caregiver.availability || 'Available',
    coverageAreas: merged.coverageAreas || (caregiver.center ? [caregiver.center] : []),
    specialisations: merged.specialisations || [],
    workingDays: merged.workingDays || [],
    address: [merged.address, merged.postcode, merged.city, merged.state].filter(Boolean).join(', '),
    emergencyContact: merged.emergencyName ? `${merged.emergencyName} · ${merged.emergencyPhone || ''}` : '',
    documents: null,
    documentList: Array.isArray(caregiver.documents) ? caregiver.documents : [],
    joinedOn: caregiver.createdAt || caregiver.joinedOn || '',
    accountStatus: ACCOUNT_STATUS.active,
    source,
    application: null,
    pendingChange: getChangeRequest(email),
  });
}

/**
 * Every caregiver the admin knows about: the original directory, caregivers
 * the admin added by hand, and everyone who applied online. Drafts are
 * excluded — the applicant has not submitted them yet.
 */
export function listCaregiverAccounts() {
  const applications = listApplications().filter(
    (application) => OPEN_STATUSES.includes(application.status) || application.status === STATUS.approved || application.status === STATUS.rejected,
  );
  const manual = listManualCaregivers();

  return [
    ...applications.map(fromApplication),
    ...manual.map((caregiver) => fromDirectory(caregiver, 'manual')),
  ];
}

// Async fetch with PostgreSQL API integration.
export async function fetchCaregiverAccounts() {
  try {
    const res = await fetch('/api/caregivers');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((cg) => ({
          id: cg.id,
          name: cg.name,
          gender: cg.gender,
          center: cg.center || cg.center_name,
          availability: cg.availability || 'Available',
          username: cg.username || cg.email?.split('@')[0],
          email: cg.email,
          phone: cg.phone,
          accountStatus: cg.account_status || 'Active',
          source: 'database',
          languages: Array.isArray(cg.languages) ? cg.languages : ['Malay', 'English'],
          specialisations: Array.isArray(cg.skills) ? cg.skills : [],
          coverageAreas: [cg.center || cg.center_name].filter(Boolean),
          experienceBand: cg.experience_band || '3 - 5 years',
          workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          shift: cg.shift_preference || 'Morning (7am - 3pm)',
          travelMode: cg.travel_mode || 'Car',
          bio: cg.bio || '',
          bookings: [],
          bookingSummary: { total: 0, completed: 0, pending: 0, cancelled: 0 },
        }));
      }
    }
  } catch (err) {
    console.warn('[fetchCaregiverAccounts] API fetch error:', err.message);
  }
  return listCaregiverAccounts();
}

/**
 * The pool the booking engine offers to patients: Active caregivers only.
 * Approved applicants appear here automatically; suspended or deactivated
 * caregivers drop out while keeping their record.
 */
export function listBookableCaregivers() {
  return listCaregiverAccounts().filter(isBookable);
}

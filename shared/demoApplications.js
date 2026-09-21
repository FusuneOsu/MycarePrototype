// Seed data so the admin approval queue has something to review on a fresh
// browser. Everything here is built through the normal store API, so the
// records are shaped exactly like ones a real applicant produces.
//
// Seeding NEVER overwrites an existing record — if you have applied through the
// wizard yourself, your application is left alone.
import { DEMO_CAREGIVER } from './demoCaregiver.js';
import {
  EDITABLE_FIELDS, STATUS, STORE_KEYS, getApplication, getChangeRequest, requestProfileChanges,
  saveApplication, setApplicationStatus, startApplication, submitApplication,
} from './caregiverStore.js';

const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();

const file = (name, size) => ({ name, size, type: name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' });

export const DEMO_APPLICATIONS = [
  {
    // Complete and ready to approve — the happy path.
    status: STATUS.submitted,
    submittedAt: daysAgo(1),
    data: {
      fullName: 'Aina Yusof', email: 'aina.yusof@example.com', phone: '+60 12-408 7731',
      gender: 'Female', idNumber: '980214-14-5108',
      experienceBand: '3 - 5 years', previousEmployer: 'Columbia Asia · Home Nursing',
      bio: 'Five years supporting recovery at home after orthopaedic surgery. I keep families updated after every visit.',
      specialisations: ['Post-operative care', 'Wound care', 'Elderly care'],
      languages: ['Malay', 'English'],
      preferredCenter: 'Petaling Jaya', coverageAreas: ['Petaling Jaya', 'Bangsar', 'Subang Jaya'], workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      shift: 'Morning (7am - 3pm)', travelMode: 'Car', startDate: '2026-10-05',
      documents: {
        identity: file('aina-ic.pdf', 184320),
        certificate: file('diploma-nursing-2020.pdf', 421888),
        training: file('cpr-first-aid-2025.pdf', 98304),
        reference: file('columbia-asia-reference.pdf', 132096),
      },
    },
  },
  {
    // Already picked up by a coordinator, and missing the optional extras.
    status: STATUS.review,
    submittedAt: daysAgo(3),
    data: {
      fullName: 'Rizwan Malik', email: 'rizwan.malik@example.com', phone: '+60 19-332 9014',
      gender: 'Male', idNumber: '930725-10-5533',
      experienceBand: '6 - 10 years', previousEmployer: 'KPJ Ampang Puteri',
      bio: 'Background in physiotherapy support and mobility rehabilitation for stroke patients.',
      specialisations: ['Physiotherapy support', 'Elderly care', 'Dementia care'],
      languages: ['Malay', 'English', 'Tamil'],
      preferredCenter: 'Ampang', coverageAreas: ['Ampang', 'Setapak', 'Kuala Lumpur City'], workingDays: ['Mon', 'Wed', 'Fri', 'Sat'],
      shift: 'Flexible', travelMode: 'Motorcycle', startDate: '2026-10-12',
      documents: {
        identity: file('rizwan-ic.jpg', 233472),
        certificate: file('physio-assistant-cert.pdf', 356352),
      },
    },
  },
  {
    // Blocked on the applicant — demonstrates the "More info needed" state.
    status: STATUS.moreInfo,
    submittedAt: daysAgo(6),
    reviewNote: 'Your CPR certificate expired in March. Please upload a current one before we can continue.',
    data: {
      fullName: 'Chong Mei Yee', email: 'meiyee.chong@example.com', phone: '+60 16-771 2280',
      gender: 'Female', idNumber: '000918-08-2241',
      experienceBand: 'Less than 1 year', previousEmployer: '',
      bio: 'Recent graduate looking to build experience in companionship and daily living support.',
      specialisations: ['Elderly care', 'Medication management'],
      languages: ['Chinese', 'English', 'Malay'],
      preferredCenter: 'Cheras', coverageAreas: ['Cheras'], workingDays: ['Sat', 'Sun'],
      shift: 'Afternoon (3pm - 11pm)', travelMode: 'Public Transport', startDate: '',
      documents: {
        identity: file('meiyee-ic.pdf', 176128),
        certificate: file('caregiving-cert-2025.pdf', 288768),
        training: file('cpr-expired-2023.pdf', 76800),
      },
    },
  },
  {
    // Half-finished: proves drafts stay private and never reach the admin queue.
    status: STATUS.draft,
    step: 2,
    data: {
      fullName: 'Daniel Foo', email: 'daniel.foo@example.com', phone: '+60 11-2298 4417',
      gender: 'Male', idNumber: '950402-07-5119',
      experienceBand: '1 - 2 years', previousEmployer: '',
      bio: '', specialisations: [], languages: ['English'],
      preferredCenter: '', coverageAreas: [], workingDays: [], shift: '', travelMode: '', startDate: '',
      documents: {},
    },
  },
];

const SEED_PASSWORD = 'password123';

/** Idempotent: fills in only what is missing, so real records are never touched. */
export function seedDemoApplications() {
  DEMO_APPLICATIONS.forEach((seed) => {
    const { email } = seed.data;
    if (getApplication(email)) return;

    startApplication({ fullName: seed.data.fullName, email, password: SEED_PASSWORD });
    saveApplication(email, { data: seed.data });

    if (seed.status === STATUS.draft) {
      saveApplication(email, { step: seed.step });
      return;
    }

    submitApplication(email);
    saveApplication(email, { submittedAt: seed.submittedAt });
    if (seed.status !== STATUS.submitted) setApplicationStatus(email, seed.status, seed.reviewNote || '');
  });

  // A pending profile edit on an already-active caregiver, so the second kind
  // of approval is testable too.
  if (!getChangeRequest(DEMO_CAREGIVER.email)) {
    const current = { ...DEMO_CAREGIVER, caregiverId: DEMO_CAREGIVER.id };
    const edited = Object.fromEntries(
      EDITABLE_FIELDS.map((field) => [field.id, current[field.id] ?? (field.type === 'chips' ? [] : '')]),
    );
    edited.phone = '+60 12-707 4412';
    edited.address = '5-8 Jalan Telawi 3, Bangsar Baru';
    edited.languages = [...DEMO_CAREGIVER.languages, 'Tamil'];
    requestProfileChanges(DEMO_CAREGIVER.email, current, edited);
  }
}

/** Wipes every application, profile edit and approved overlay. Demo reset. */
export function resetDemoData() {
  STORE_KEYS.forEach((storeKey) => window.localStorage.removeItem(storeKey));
}

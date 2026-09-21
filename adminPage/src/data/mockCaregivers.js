// Placeholder data shaped like the future `caregivers` D1 table
// (see db/schema.sql). Swap fetchCaregivers() for a real API call
// once the Pages Function + D1 binding is wired up.
//
// Extra fields (username, languages, travelMode, workAccommodations,
// autoAssigned, managerName, managerId) mirror what the New Caregiver
// wizard collects, so the "See more" detail popup has something to show.

import { DEMO_CAREGIVER } from '../../../shared/demoCaregiver.js';

export const mockCaregivers = [
  {
    id: 'CG-1001', name: 'Adam Tan', gender: 'Male', center: 'Petaling Jaya', availability: 'Available',
    username: 'adam.tan', languages: ['English', 'Malay'], travelMode: 'Car',
    workAccommodations: 'Prefers morning shifts due to a standing evening commitment.',
    autoAssigned: 'Yes', managerName: 'Grace Lim', managerId: 'MGR-001',
  },
  {
    id: 'CG-1002', name: 'Nurul Huda', gender: 'Female', center: 'Subang Jaya', availability: 'On Duty',
    username: 'nurul.huda', languages: ['Malay', 'English'], travelMode: 'Public Transport',
    workAccommodations: 'Needs wheelchair-accessible client homes only.',
    autoAssigned: 'No', managerName: 'Daniel Wong', managerId: 'MGR-002',
  },
  {
    id: 'CG-1003', name: 'Adam Krishnan', gender: 'Male', center: 'Cheras', availability: 'Off Duty',
    username: 'adam.krishnan', languages: ['Tamil', 'English', 'Malay'], travelMode: 'Motorcycle',
    workAccommodations: '',
    autoAssigned: 'Yes', managerName: 'Aisyah Rahman', managerId: 'MGR-003',
  },
  {
    id: 'CG-1004', name: 'Siti Aminah', gender: 'Female', center: 'Petaling Jaya', availability: 'Available',
    username: 'siti.aminah', languages: ['Malay'], travelMode: 'Ride-sharing',
    workAccommodations: 'Requires a 15-minute break every 3 hours for a medical condition.',
    autoAssigned: 'No', managerName: 'Grace Lim', managerId: 'MGR-001',
  },
  {
    id: 'CG-1005', name: 'Wei Ling Chong', gender: 'Female', center: 'Ampang', availability: 'On Leave',
    username: 'weiling.chong', languages: ['Chinese', 'English'], travelMode: 'Car',
    workAccommodations: '',
    autoAssigned: 'Yes', managerName: 'Kevin Pillai', managerId: 'MGR-004',
  },
  {
    id: 'CG-1006', name: 'Rajesh Kumar', gender: 'Male', center: 'Subang Jaya', availability: 'On Duty',
    username: 'rajesh.kumar', languages: ['Tamil', 'English'], travelMode: 'Car',
    workAccommodations: 'Travels with own equipment, needs parking access at site.',
    autoAssigned: 'No', managerName: 'Daniel Wong', managerId: 'MGR-002',
  },
  {
    id: 'CG-1007', name: 'Farah Aziz', gender: 'Female', center: 'Cheras', availability: 'Available',
    username: 'farah.aziz', languages: ['Malay', 'Chinese'], travelMode: 'Public Transport',
    workAccommodations: '',
    autoAssigned: 'Yes', managerName: 'Aisyah Rahman', managerId: 'MGR-003',
  },
  {
    id: 'CG-1008', name: 'Adam Osei', gender: 'Male', center: 'Ampang', availability: 'Off Duty',
    username: 'adam.osei', languages: ['English'], travelMode: 'Motorcycle',
    workAccommodations: 'Prefers not to be assigned back-to-back double shifts.',
    autoAssigned: 'No', managerName: 'Kevin Pillai', managerId: 'MGR-004',
  },
  {
    id: 'CG-1009', name: 'Mei Ling Ong', gender: 'Female', center: 'Petaling Jaya', availability: 'On Duty',
    username: 'meiling.ong', languages: ['Chinese', 'English', 'Malay'], travelMode: 'Car',
    workAccommodations: '',
    autoAssigned: 'Yes', managerName: 'Grace Lim', managerId: 'MGR-001',
  },
  {
    id: 'CG-1010', name: 'Hafiz Rahman', gender: 'Male', center: 'Ampang', availability: 'Available',
    username: 'hafiz.rahman', languages: ['Malay', 'English'], travelMode: 'Ride-sharing',
    workAccommodations: 'Fasting-related schedule adjustments during Ramadan.',
    autoAssigned: 'No', managerName: 'Kevin Pillai', managerId: 'MGR-004',
  },
  {
    id: 'CG-1011', name: 'Priya Sharma', gender: 'Female', center: 'Cheras', availability: 'On Leave',
    username: 'priya.sharma', languages: ['Tamil', 'English'], travelMode: 'Public Transport',
    workAccommodations: '',
    autoAssigned: 'Yes', managerName: 'Aisyah Rahman', managerId: 'MGR-003',
  },
  {
    id: 'CG-1012', name: 'Marcus D\u2019Souza', gender: 'Male', center: 'Subang Jaya', availability: 'Available',
    username: 'marcus.dsouza', languages: ['English'], travelMode: 'Car',
    workAccommodations: 'Assigned centre must be within 20 minutes of Subang Jaya.',
    autoAssigned: 'No', managerName: 'Daniel Wong', managerId: 'MGR-002',
  },
  // The caregiver app's demo login \u2014 one record, shared by both apps.
  DEMO_CAREGIVER,
];

/** Directory records predate the application flow, so most have no stored email. */
export const caregiverEmail = (caregiver) => caregiver.email || `${caregiver.username}@mycaregivers.com`;

// Simulates an async fetch so swapping in a real API later is a one-line change.
export function fetchCaregivers() {
  return Promise.resolve(mockCaregivers);
}

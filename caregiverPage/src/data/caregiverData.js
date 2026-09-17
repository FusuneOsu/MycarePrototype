export const caregiver = { name: 'Sarah Tan', initials: 'ST', role: 'Caregiver' };

export const patients = {
  mei: { name: 'Mei Ling', initials: 'ML', location: 'Taman Desa', distance: '1.2 km away', care: 'Medication check-in', time: '08:30 - 09:15', title: 'Morning medication & check-in', amount: 'RM 85.00', date: '23 Sep 2024', tone: 'mint' },
  ahmad: { name: 'Ahmad Ibrahim', initials: 'AI', location: 'Bangsar', distance: '4.8 km away', care: 'Physiotherapy support', time: '10:30 - 11:30', title: 'Physiotherapy support', amount: 'RM 110.00', date: '21 Sep 2024', tone: 'blue' },
  lily: { name: 'Lily Wong', initials: 'LW', location: 'Seputeh', distance: '3.6 km away', care: 'Companionship', time: '14:00 - 15:30', title: 'Grocery support & companionship', amount: 'RM 150.00', date: '19 Sep 2024', tone: 'coral' },
};

export const stats = [
  ['Today\'s progress', '72%', '↑ 8% from yesterday', '✓'],
  ['Active jobs', '04', '2 due in the next hour', '▣'],
  ['Hours this week', '28.5h', 'of 40h scheduled', '◷'],
  ['Client wellbeing', '98%', 'Excellent overall', '♡'],
];

export const history = [
  { patient: 'mei', duration: '45 min', status: 'Paid' },
  { patient: 'ahmad', duration: '1 hr', status: 'Paid' },
  { patient: 'lily', duration: '1.5 hr', status: 'Follow-up' },
];

export const DEMO_REQUEST_STORAGE_KEY = 'mycare.patientRequest.WA-REQ-1001';
export const demoRequestPatient = {
  name: 'Nur Aisyah Rahman',
  initials: 'NA',
  location: 'Kuala Lumpur',
  distance: '24 Jalan Damai',
  care: 'Post-operative home care',
  time: '10:00 - 12:00',
  title: 'Post-operative home care',
  amount: 'RM 90.00',
  date: '28 Sep 2026',
  tone: 'mint',
  requestId: 'WA-REQ-1001',
};

export function getAssignedDemoRequest() {
  try {
    const request = JSON.parse(window.localStorage.getItem(DEMO_REQUEST_STORAGE_KEY) || 'null');
    return request?.caregiverId === 'CG-DEMO' ? request : null;
  } catch {
    return null;
  }
}

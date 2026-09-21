import { Pill } from '../../../../../shared/ui/index.js';

/**
 * Maps every status used in the admin app onto one of the shared pill tones,
 * so the same word always looks the same on every page.
 */
const TONE = {
  // Availability
  Available: 'success',
  'On Duty': 'info',
  'Off Duty': 'neutral',
  'On Leave': 'warning',
  // Account lifecycle — see data/caregiverAccounts.js
  Active: 'success',
  'Pending approval': 'pending',
  'Not approved': 'danger',
  Rejected: 'danger',
  Suspended: 'warning',
  Deactivated: 'neutral',
  'Profile update pending': 'warning',
  // Documents
  Verified: 'success',
  Submitted: 'info',
  Missing: 'danger',
  // Requests, appointments and payments
  New: 'info',
  'In Review': 'warning',
  Booked: 'success',
  'Pending assignment': 'pending',
  'Caregiver assigned': 'success',
  Scheduled: 'info',
  'In progress': 'warning',
  Completed: 'success',
  Cancelled: 'neutral',
  Missed: 'danger',
  'No caregiver assigned': 'danger',
  'Payment link sent': 'info',
  'Receipt pending': 'pending',
  'Receipt verified': 'success',
  'Receipt submitted': 'info',
  Paid: 'success',
  'Awaiting payout': 'pending',
  'Awaiting payment': 'pending',
  'Ready to pay': 'info',
  'Paid to caregiver': 'success',
  // PTO
  Approved: 'success',
  Pending: 'pending',
};

function StatusPill({ status }) {
  return <Pill tone={TONE[status] ?? 'neutral'}>{status}</Pill>;
}

export default StatusPill;

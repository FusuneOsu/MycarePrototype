import './StatusPill.css';

const STATUS_CLASS = {
  Available: 'status-pill--available',
  'On Duty': 'status-pill--on-duty',
  'Off Duty': 'status-pill--off-duty',
  'On Leave': 'status-pill--on-leave',
  // Account lifecycle — see data/caregiverAccounts.js
  Active: 'status-pill--available',
  'Pending approval': 'status-pill--pending',
  'Not approved': 'status-pill--rejected',
  Rejected: 'status-pill--rejected',
  Suspended: 'status-pill--on-leave',
  Deactivated: 'status-pill--off-duty',
  // Document states on the profile
  Verified: 'status-pill--available',
  Submitted: 'status-pill--on-duty',
  Missing: 'status-pill--rejected',
  'Profile update pending': 'status-pill--on-leave',
};

function StatusPill({ status }) {
  const modifier = STATUS_CLASS[status] ?? 'status-pill--neutral';
  return <span className={`status-pill ${modifier}`}>{status}</span>;
}

export default StatusPill;

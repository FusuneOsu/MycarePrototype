import './StatusPill.css';

const STATUS_CLASS = {
  Available: 'status-pill--available',
  'On Duty': 'status-pill--on-duty',
  'Off Duty': 'status-pill--off-duty',
  'On Leave': 'status-pill--on-leave',
};

function StatusPill({ status }) {
  const modifier = STATUS_CLASS[status] ?? 'status-pill--neutral';
  return <span className={`status-pill ${modifier}`}>{status}</span>;
}

export default StatusPill;

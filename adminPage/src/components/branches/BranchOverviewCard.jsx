import { Card } from '../../../../shared/ui/index.js';
import BranchStatus from './BranchStatus.jsx';
import './BranchOverviewCard.css';

const formatHours = (hours) => {
  if (!hours) return '—';
  if (typeof hours === 'string') {
    try { hours = JSON.parse(hours); } catch { return hours; }
  }
  return `${hours.open || '—'} – ${hours.close || '—'}`;
};

export default function BranchOverviewCard({ branch }) {
  const details = [
    ['Status', <BranchStatus key="branch-status" status={branch.status} />],
    ['Address', branch.address],
    ['Service area', branch.service_area],
    ['Phone', branch.phone || '—'],
    ['Email', branch.email || '—'],
    ['Operating hours', formatHours(branch.operating_hours)],
    ['Capacity', branch.capacity],
    ['Caregivers', branch.caregiver_count],
    ['Ongoing appointments', branch.ongoing_appointment_count],
  ];

  return (
    <Card className="branch-overview-card">
      <h2>{branch.name}</h2>
      <dl>
        {details.map(([label, value]) => (
          <div className="branch-overview-card__row" key={label}>
            <dt>{label}</dt><dd>{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

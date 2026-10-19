import { Card, StatCard } from '../../../../shared/ui/index.js';

const STATUS_COLORS = {
  'Caregiver assigned': 'var(--ui-blue)',
  'In progress': 'var(--ui-amber)',
  'Service completed': 'var(--ui-green)',
  'Cancelled': 'var(--ui-red)',
  'Missed': 'var(--ui-red)',
  'Link sent (Unpaid)': 'var(--ui-orange)',
  'Paid - Online': 'var(--ui-green)',
  'Paid - Collected Directly': 'var(--ui-teal)',
};

export default function BookingsOverviewCard({ bookingsAgg }) {
  if (!bookingsAgg) return null;

  const { total, upcoming, inProgress, completed, cancelled, byStatus } = bookingsAgg;

  return (
    <Card title="Bookings overview">
      <div className="dashboard-page__stat-row">
        <StatCard label="Total" value={total} />
        <StatCard label="Upcoming" value={upcoming} />
        <StatCard label="In progress" value={inProgress} />
        <StatCard label="Completed" value={completed} />
        <StatCard label="Cancelled" value={cancelled} />
      </div>
      {Object.keys(byStatus).length > 0 && (
        <div className="dashboard-page__bar-list" style={{ marginTop: 16 }}>
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status}>
              <div className="dashboard-page__bar-labels">
                <span>{status}</span>
                <span>{count}</span>
              </div>
              <div className="dashboard-page__bar-track">
                <span
                  style={{
                    width: `${total ? (count / total) * 100 : 0}%`,
                    background: STATUS_COLORS[status] || 'var(--ui-line)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

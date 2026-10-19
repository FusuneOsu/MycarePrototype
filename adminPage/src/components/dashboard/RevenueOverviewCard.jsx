import { Card, StatCard, Table, CellStack } from '../../../../shared/ui/index.js';

export default function RevenueOverviewCard({ revenueAgg }) {
  if (!revenueAgg) return null;

  const { paid, unpaid, paidCents, unpaidCents, byServiceType, byCaregiver } = revenueAgg;
  const totalCents = paidCents + unpaidCents;
  const collectedPct = totalCents ? Math.round((paidCents / totalCents) * 100) : 0;

  return (
    <Card title="Revenue overview">
      <div className="dashboard-page__stat-row">
        <StatCard label="Collected" value={paid} />
        <StatCard label="Outstanding" value={unpaid} />
        <StatCard label="Collection rate" value={`${collectedPct}%`} />
      </div>

      {byServiceType.length > 0 && (
        <>
          <h4 className="dashboard-page__subtitle">By service type</h4>
          <Table columns={['Service', 'Collected', 'Outstanding', 'Bookings']} label="Revenue by service type">
            {byServiceType.map((s) => (
              <tr key={s.service}>
                <td><CellStack primary={s.service} /></td>
                <td>RM {(s.paidCents / 100).toFixed(2)}</td>
                <td>RM {(s.unpaidCents / 100).toFixed(2)}</td>
                <td>{s.count}</td>
              </tr>
            ))}
          </Table>
        </>
      )}

      {byCaregiver.length > 0 && (
        <>
          <h4 className="dashboard-page__subtitle">By caregiver</h4>
          <Table columns={['Caregiver', 'Collected', 'Outstanding', 'Bookings']} label="Revenue by caregiver">
            {byCaregiver.map((c) => (
              <tr key={c.name}>
                <td><CellStack primary={c.name} /></td>
                <td>RM {(c.paidCents / 100).toFixed(2)}</td>
                <td>RM {(c.unpaidCents / 100).toFixed(2)}</td>
                <td>{c.count}</td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </Card>
  );
}

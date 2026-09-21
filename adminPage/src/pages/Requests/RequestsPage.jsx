import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import { Button, Card, CellStack, SectionHeader, Select, StatCard, StatGrid, Table } from '../../../../shared/ui/index.js';

const requests = [
  { id: 'WA-REQ-1001', source: 'WhatsApp', patient: 'Nur Aisyah Rahman', care: 'Post-operative home care', location: 'Kuala Lumpur', date: '28 Sep 2026 · 10:00', status: 'New' },
  { id: 'WEB-REQ-1002', source: 'Website', patient: 'Daniel Lim', care: 'Daily home assistance', location: 'Subang Jaya', date: '29 Sep 2026 · 09:00', status: 'In Review' },
  { id: 'WA-REQ-0998', source: 'WhatsApp', patient: 'Nadia Ismail', care: 'Physiotherapy support', location: 'Petaling Jaya', date: '24 Sep 2026 · 14:00', status: 'Booked' },
  { id: 'WEB-REQ-0995', source: 'Website', patient: 'Sofia Hassan', care: 'Medication reminders', location: 'Cheras', date: '30 Sep 2026 · 11:00', status: 'Rejected' },
];

const count = (status) => requests.filter((request) => request.status === status).length;

export default function RequestsPage() {
  const navigate = useNavigate();
  const [source, setSource] = useState('All');
  const [status, setStatus] = useState('All');
  const filtered = useMemo(() => requests.filter((request) => (source === 'All' || request.source === source) && (status === 'All' || request.status === status)), [source, status]);

  return (
    <div className="requests-page">
      <Topbar title="Requests" subtitle="Review every patient request before turning it into a booking." />

      <StatGrid>
        <StatCard label="New" value={count('New')} note="Waiting for first review" icon="◌" />
        <StatCard label="In review" value={count('In Review')} note="Being matched to a caregiver" icon="◷" tone="gold" />
        <StatCard label="Booked" value={count('Booked')} note="Turned into appointments" icon="✓" />
        <StatCard label="Sources" value="2" note="WhatsApp and website" icon="▣" />
      </StatGrid>

      <Card padded>
        <SectionHeader
          eyebrow="Central intake queue"
          title="Patient requests"
          intro="WhatsApp and website requests follow the same review and assignment workflow."
          actions={(
            <>
              <Select size="sm" value={source} onChange={(event) => setSource(event.target.value)} aria-label="Filter by source">
                <option value="All">All sources</option>
                <option>WhatsApp</option>
                <option>Website</option>
              </Select>
              <Select size="sm" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
                <option value="All">All statuses</option>
                <option>New</option>
                <option>In Review</option>
                <option>Booked</option>
                <option>Rejected</option>
              </Select>
            </>
          )}
        />

        <Table
          columns={['Request', 'Patient', 'Care requested', 'Location', 'Preferred visit', 'Status', '']}
          label="Patient requests"
          empty={filtered.length === 0 && 'No requests match these filters.'}
        >
          {filtered.map((request) => (
            <tr key={request.id} onClick={() => navigate(`/requests/${request.id}`)} style={{ cursor: 'pointer' }}>
              <td><CellStack primary={request.id} secondary={request.source} /></td>
              <td>{request.patient}</td>
              <td className="ui-table__muted">{request.care}</td>
              <td>{request.location}</td>
              <td className="ui-table__muted">{request.date}</td>
              <td><StatusPill status={request.status} /></td>
              <td className="ui-table__actions">
                <Button variant="link" onClick={(event) => { event.stopPropagation(); navigate(`/requests/${request.id}`); }}>Open ›</Button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import { REQUEST_SOURCES, REQUEST_STATUS, REQUEST_STATUSES, formatDate, listRequests } from '../../../../shared/bookingStore.js';
import { Button, Card, CellStack, Input, SectionHeader, Select, StatCard, StatGrid, Table, Toolbar } from '../../../../shared/ui/index.js';

/** Central requests queue — every WhatsApp and website request, with its status. */
export default function RequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(listRequests);
  const [source, setSource] = useState('All');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');

  const refresh = useCallback(() => setRequests(listRequests()), []);
  useEffect(() => {
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); };
  }, [refresh]);

  const count = (value) => requests.filter((request) => request.status === value).length;
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((request) =>
      (source === 'All' || request.source === source)
      && (status === 'All' || request.status === status)
      && (!term || `${request.id} ${request.patientName} ${request.phone} ${request.area} ${request.careType}`.toLowerCase().includes(term)));
  }, [requests, source, status, search]);

  return (
    <div className="requests-page">
      <Topbar title="Requests" subtitle="Review every patient request before turning it into a booking." />

      <StatGrid>
        <StatCard label="New" value={count(REQUEST_STATUS.new)} note="Waiting for first review" icon="◌" onClick={() => setStatus(REQUEST_STATUS.new)} active={status === REQUEST_STATUS.new} />
        <StatCard label="In review" value={count(REQUEST_STATUS.review)} note="Being matched to a caregiver" icon="◷" tone="gold" onClick={() => setStatus(REQUEST_STATUS.review)} active={status === REQUEST_STATUS.review} />
        <StatCard label="Booked" value={count(REQUEST_STATUS.booked)} note="Confirmed bookings" icon="✓" onClick={() => setStatus(REQUEST_STATUS.booked)} active={status === REQUEST_STATUS.booked} />
        <StatCard label="Rejected" value={count(REQUEST_STATUS.rejected)} note="Closed with a reason" icon="✕" tone="warn" onClick={() => setStatus(REQUEST_STATUS.rejected)} active={status === REQUEST_STATUS.rejected} />
      </StatGrid>

      <Card padded>
        <SectionHeader eyebrow="Central intake queue" title="Patient requests" intro="WhatsApp and website requests follow the same review and booking workflow." />

        <Toolbar className="requests-toolbar">
          <Input size="sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, phone, request ID, zone or care type" aria-label="Search requests" />
          <Select size="sm" value={source} onChange={(event) => setSource(event.target.value)} aria-label="Filter by source">
            <option value="All">All sources</option>
            {REQUEST_SOURCES.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select size="sm" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="All">All statuses</option>
            {REQUEST_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </Toolbar>

        <Table
          columns={['Request', 'Patient', 'Care needed', 'Location', 'Preferred visit', 'Status', '']}
          label="Patient requests"
          empty={filtered.length === 0 && 'No requests match these filters.'}
        >
          {filtered.map((request) => (
            <tr key={request.id} onClick={() => navigate(`/requests/${request.id}`)} style={{ cursor: 'pointer' }}>
              <td><CellStack primary={request.id} secondary={request.source} /></td>
              <td><CellStack primary={request.patientName} secondary={request.phone} /></td>
              <td><CellStack primary={request.careType} secondary={`Prefers ${request.preferredGender === 'No preference' ? 'any gender' : request.preferredGender.toLowerCase()}`} /></td>
              <td>{request.area}</td>
              <td><CellStack primary={formatDate(request.preferredDate)} secondary={request.preferredStart} /></td>
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

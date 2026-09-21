import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import { mockRequests, getEffectiveRequest } from '../../data/mockRequests.js';
import './RequestsPage.css';

// Re-reads localStorage overrides on every render so an assignment made on
// the request detail page shows up here immediately after navigating back.
// Booked requests have moved to the Booking Records page, so they drop out
// of this queue entirely instead of sitting here alongside active requests.
function useRequestsWithAssignments() {
  return useMemo(
    () => mockRequests.map((item) => getEffectiveRequest(item.id)).filter((request) => request.status !== 'Booked'),
    [],
  );
}

export default function RequestsPage() {
  const navigate = useNavigate();
  const requests = useRequestsWithAssignments();
  const [source, setSource] = useState('All');
  const [status, setStatus] = useState('All');
  const filtered = useMemo(() => requests.filter((request) => (source === 'All' || request.source === source) && (status === 'All' || request.status === status)), [requests, source, status]);

  return <div className="requests-page"><Topbar title="Requests" subtitle="Review every patient request before turning it into a booking." /><div className="requests-page__body"><div className="requests-page__intro"><div><p className="requests-page__eyebrow">Central intake queue</p><h2>Patient requests</h2><p>WhatsApp and website requests follow the same review and assignment workflow.</p></div><div className="requests-page__filters"><select value={source} onChange={(event) => setSource(event.target.value)} aria-label="Filter by source"><option>All</option><option>WhatsApp</option><option>Website</option></select><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status"><option>All</option><option>New</option><option>In Review</option><option>Booked</option><option>Rejected</option></select></div></div><div className="requests-page__summary"><div><span>New</span><strong>{requests.filter((request) => request.status === 'New').length}</strong></div><div><span>In review</span><strong>{requests.filter((request) => request.status === 'In Review').length}</strong></div><div><span>Booked</span><strong>{requests.filter((request) => request.status === 'Booked').length}</strong></div><div><span>Sources</span><strong>WhatsApp + Website</strong></div></div><section className="requests-table"><div className="requests-table__head"><span>Request</span><span>Patient</span><span>Care requested</span><span>Location</span><span>Preferred visit</span><span>Caregiver</span><span>Status</span><span /></div>{filtered.map((request) => <button type="button" className="requests-table__row" key={request.id} onClick={() => navigate(`/requests/${request.id}`)}><span><strong>{request.id}</strong><small>{request.source}</small></span><span>{request.patientName}</span><span>{request.careType}</span><span>{request.location}</span><span>{request.requestedDate} · {request.preferredTime}</span><span>{request.caregiverName || 'Unassigned'}</span><StatusPill status={request.status} /><span className="requests-table__arrow">›</span></button>)}</section></div></div>;
}


import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import './RequestsPage.css';

const requests = [
  { id: 'WA-REQ-1001', source: 'WhatsApp', patient: 'Nur Aisyah Rahman', care: 'Post-operative home care', location: 'Kuala Lumpur', date: '28 Sep 2026 · 10:00', status: 'New' },
  { id: 'WEB-REQ-1002', source: 'Website', patient: 'Daniel Lim', care: 'Daily home assistance', location: 'Subang Jaya', date: '29 Sep 2026 · 09:00', status: 'In Review' },
  { id: 'WA-REQ-0998', source: 'WhatsApp', patient: 'Nadia Ismail', care: 'Physiotherapy support', location: 'Petaling Jaya', date: '24 Sep 2026 · 14:00', status: 'Booked' },
  { id: 'WEB-REQ-0995', source: 'Website', patient: 'Sofia Hassan', care: 'Medication reminders', location: 'Cheras', date: '30 Sep 2026 · 11:00', status: 'Rejected' },
];

export default function RequestsPage() {
  const navigate = useNavigate();
  const [source, setSource] = useState('All');
  const [status, setStatus] = useState('All');
  const filtered = useMemo(() => requests.filter((request) => (source === 'All' || request.source === source) && (status === 'All' || request.status === status)), [source, status]);

  return <div className="requests-page"><Topbar title="Requests" subtitle="Review every patient request before turning it into a booking." /><div className="requests-page__body"><div className="requests-page__intro"><div><p className="requests-page__eyebrow">Central intake queue</p><h2>Patient requests</h2><p>WhatsApp and website requests follow the same review and assignment workflow.</p></div><div className="requests-page__filters"><select value={source} onChange={(event) => setSource(event.target.value)} aria-label="Filter by source"><option>All</option><option>WhatsApp</option><option>Website</option></select><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status"><option>All</option><option>New</option><option>In Review</option><option>Booked</option><option>Rejected</option></select></div></div><div className="requests-page__summary"><div><span>New</span><strong>{requests.filter((request) => request.status === 'New').length}</strong></div><div><span>In review</span><strong>{requests.filter((request) => request.status === 'In Review').length}</strong></div><div><span>Booked</span><strong>{requests.filter((request) => request.status === 'Booked').length}</strong></div><div><span>Sources</span><strong>WhatsApp + Website</strong></div></div><section className="requests-table"><div className="requests-table__head"><span>Request</span><span>Patient</span><span>Care requested</span><span>Location</span><span>Preferred visit</span><span>Status</span><span /></div>{filtered.map((request) => <button type="button" className="requests-table__row" key={request.id} onClick={() => navigate(`/requests/${request.id}`)}><span><strong>{request.id}</strong><small>{request.source}</small></span><span>{request.patient}</span><span>{request.care}</span><span>{request.location}</span><span>{request.date}</span><StatusPill status={request.status} /><span className="requests-table__arrow">›</span></button>)}</section></div></div>;
}

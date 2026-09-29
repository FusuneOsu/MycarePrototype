import { useState } from 'react';
import { BOOKING_STATUS, formatDate, formatDuration } from '../../../../shared/bookingStore.js';

/**
 * Job history rows come from the caregiver's own bookings, not demo data, so
 * "View details" opens the real record — the rows are keyed by booking id,
 * which is what the job detail page looks up.
 */
const historyRows = (jobs) => Object.values(jobs)
  .filter((job) => job.booking.status === BOOKING_STATUS.completed || job.booking.status === BOOKING_STATUS.cancelled)
  .sort((a, b) => String(b.booking.date).localeCompare(String(a.booking.date)))
  .map((job) => ({
    id: job.id,
    name: job.booking.patientName,
    care: job.booking.serviceType,
    date: formatDate(job.booking.date),
    duration: formatDuration(job.booking.durationMins),
    status: job.booking.status === BOOKING_STATUS.completed
      ? (job.booking.payoutStatus === 'Paid' ? 'Paid' : 'Completed')
      : 'Cancelled',
  }));

export default function ReportsPage({ jobs = {}, onOpenHistory, onNotify }) {
  const [filter, setFilter] = useState('all');
  const rows = historyRows(jobs).filter((row) => filter === 'all' || row.status.toLowerCase().includes(filter));
  const exportPdf = () => { onNotify('Preparing full job history PDF'); window.setTimeout(() => window.print(), 350); };
  return <section className="page-card panel"><div className="page-intro"><div><p className="eyebrow">September 2024 · Weekly view</p><h2>Care reports</h2><p>A simple pulse check on the care you delivered this week.</p></div><button className="back" onClick={() => onNotify('Report prepared for download')}>⇩ Export report</button></div><div className="report-grid"><div className="metric-list">{[['Visit completion','94%',''],['Care plan adherence','88%','blue'],['Notes submitted on time','100%','gold']].map(([label, value, tone]) => <div className="metric" key={label}><div className="metric-top"><span>{label}</span><span>{value}</span></div><div className={`meter ${tone}`}><span style={{ width: value }} /></div></div>)}</div><div className="chart"><h3>Completed visits</h3><div className="bars">{[55,72,48,83,67,92,76].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><div className="days">{['M','T','W','T','F','S','S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div></div></div><div className="report-table"><div className="report-line"><span>Care outcome</span><span>This week</span><span>Change</span></div><div className="report-line"><span>Visits completed</span><span>16 of 17</span><span className="good">↑ 2 visits</span></div><div className="report-line"><span>Patient check-ins</span><span>38</span><span className="good">↑ 12%</span></div><div className="report-line"><span>Follow-ups needed</span><span>2</span><span>Same as last week</span></div></div><div className="history-head"><h3>Job history</h3><select className="filter" aria-label="Filter job history" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All history</option><option value="completed">Completed</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select></div><div className="history-list"><div className="history-header"><span>Patient & job</span><span>Visit date</span><span>Duration</span><span>Status</span><span /></div>{rows.map((row) => <button className="history-row" key={row.id} onClick={() => onOpenHistory(row.id)}><span><strong>{row.name}</strong><small>{row.care}</small></span><span>{row.date}</span><span>{row.duration}</span><span className="status">{row.status}</span><span className="pdf-button">View details →</span></button>)}{rows.length === 0 && <div className="history-empty">No past visits yet. Completed jobs appear here.</div>}</div><button className="back history-export" onClick={exportPdf}>⇩ Generate full history PDF</button></section>;
}

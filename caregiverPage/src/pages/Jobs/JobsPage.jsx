import { Avatar } from '../../components/common.jsx';
import JobMap from '../../components/JobMap.jsx';
import { routeEstimate, todaysStops } from '../../data/jobs.js';
import { routeLink } from '../../../../shared/bookingStore.js';
import { Button, Pill } from '../../../../shared/ui/index.js';

const STATUS_TONE = { Confirmed: 'success', Rescheduled: 'warning', Cancelled: 'danger', Completed: 'info' };

export default function JobsPage({ jobs, center, onOpenPatient, onNavigate }) {
  const all = Object.values(jobs);
  const stops = todaysStops(jobs);
  const estimate = routeEstimate(stops, center);
  const route = routeLink(stops.map((job) => job.booking));

  return <section className="page-card panel">
    <div className="page-intro">
      <div><p className="eyebrow">{String(all.filter((job) => job.active).length).padStart(2, '0')} active assignments</p><h2>My jobs</h2><p>See where you need to be and what each person needs. Tap a pin to navigate.</p></div>
      <Button variant="primary" size="sm" href={route || undefined} target="_blank" rel="noreferrer" aria-disabled={!route}>Open today’s route ↗</Button>
    </div>
    <div className="route">
      <JobMap jobs={stops} onPick={onNavigate} className="route-map" />
      <div className="route-summary">
        <h3>Today’s route</h3>
        <strong>{estimate.km} km</strong>
        <p>Estimated drive · {estimate.minutes} min from {center || 'your center'}</p>
        <div className="route-stops"><span>Start</span><i className="stop-line" /><span>{stops.length} stop{stops.length === 1 ? '' : 's'}</span></div>
        <p className="route-hint">Opens every stop in order in Google Maps.</p>
      </div>
    </div>
    <div className="patient-list">
      <div className="patient-list-head"><span>Patient & location</span><span>Care plan</span><span>Visit</span><span /></div>
      {all.length === 0 && <div className="history-empty">No upcoming jobs. New bookings from your coordinator will appear here.</div>}
      {all.map((job) => <button className="patient-row" key={job.id} onClick={() => onOpenPatient(job.id)}>
        <span className="patient"><Avatar initials={job.initials} tone={job.tone} /><span><strong>{job.name}</strong><small>{job.neighbourhood} · {job.booking.area}</small></span></span>
        <span className="care-type">{job.care}</span>
        <span className="time">{job.dateLabel} · {job.time}{!job.active && <> <Pill tone={STATUS_TONE[job.status]}>{job.status}</Pill></>}</span>
        <span className="arrow">›</span>
      </button>)}
    </div>
  </section>;
}

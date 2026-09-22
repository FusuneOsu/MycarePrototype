import { Avatar } from '../../components/common.jsx';
import JobMap from '../../components/JobMap.jsx';
import { stats } from '../../data/caregiverData.js';
import { todaysStops } from '../../data/jobs.js';
import { routeLink } from '../../../../shared/bookingStore.js';
import { StatCard, StatGrid } from '../../../../shared/ui/index.js';

export default function DashboardPage({ jobs, onNavigate, onOpenPatient, onNavigateTo }) {
  const upcoming = Object.values(jobs).filter((job) => job.active);
  const stops = todaysStops(jobs);
  const route = routeLink(stops.map((job) => job.booking));
  // "Active jobs" is live from bookings; the other tiles are illustrative.
  const tiles = stats.map(([label, value, note, icon]) => (label === 'Active jobs'
    ? [label, String(upcoming.length).padStart(2, '0'), `${stops.length} today`, icon]
    : [label, value, note, icon]));

  return <>
    <StatGrid>{tiles.map(([label, value, note, icon]) => <StatCard key={label} label={label} value={value} note={note} icon={icon} />)}</StatGrid>
    <div className="grid">
      <section className="panel">
        <div className="head"><h3>Assigned jobs</h3><button className="link-button" onClick={() => onNavigate('jobs')}>View all</button></div>
        {upcoming.length === 0 && <div className="history-empty">No upcoming jobs.</div>}
        {upcoming.slice(0, 5).map((job, index) => <button className="job" key={job.id} onClick={() => onOpenPatient(job.id)}><Avatar initials={job.initials} tone={job.tone} /><span><strong>{job.name}</strong><small>{job.care} · {job.dateLabel} · {job.time}</small></span><span className="status">{index === 0 ? 'Next' : 'Upcoming'}</span></button>)}
      </section>
      <section className="panel map-panel">
        <div className="head"><h3>Today’s job locations</h3>{route && <a className="link-button" href={route} target="_blank" rel="noreferrer">Open route ↗</a>}</div>
        <JobMap jobs={stops} onPick={onNavigateTo} />
        <div className="legend">{stops.map((job, index) => <span key={job.id} className={['', 'blue', 'coral'][index % 3]}>{index + 1}. {job.name}</span>)}</div>
      </section>
    </div>
  </>;
}

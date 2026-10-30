import { Avatar } from '../../components/common.jsx';
import JobMap from '../../components/JobMap.jsx';
import { todaysStops } from '../../data/jobs.js';
import { routeLink } from '../../../../shared/bookingStore.js';
import { StatCard, StatGrid } from '../../../../shared/ui/index.js';

export default function DashboardPage({ jobs, onNavigate, onOpenPatient, onNavigateTo }) {
  const allJobsList = Object.values(jobs);
  const upcoming = allJobsList.filter((job) => job.active);
  const stops = todaysStops(jobs);
  const completedJobs = allJobsList.filter((job) => job.status === 'Service completed');
  const route = routeLink(stops.map((job) => job.booking));

  const totalMins = allJobsList.reduce((acc, j) => acc + (j.booking?.durationMins || 60), 0);
  const totalHours = (totalMins / 60).toFixed(1);

  const tiles = [
    { label: 'Active jobs', value: String(upcoming.length).padStart(2, '0'), note: `${stops.length} visit${stops.length === 1 ? '' : 's'} scheduled for today`, icon: '▣' },
    { label: 'Today’s visits', value: String(stops.length).padStart(2, '0'), note: stops.length > 0 ? 'Assigned stops' : 'No visits today', icon: '◷' },
    { label: 'Completed visits', value: String(completedJobs.length).padStart(2, '0'), note: 'Visits successfully completed', icon: '✓' },
    { label: 'Scheduled hours', value: `${totalHours}h`, note: 'Total commitment duration', icon: '⏱' },
  ];

  return <>
    <StatGrid>{tiles.map((t) => <StatCard key={t.label} label={t.label} value={t.value} note={t.note} icon={t.icon} />)}</StatGrid>
    <div className="grid">
      <section className="panel">
        <div className="head"><h3>Assigned jobs</h3><button className="link-button" onClick={() => onNavigate('jobs')}>View all</button></div>
        {upcoming.length === 0 && <div className="history-empty">No upcoming jobs in the database.</div>}
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

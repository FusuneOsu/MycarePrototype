/**
 * A lightweight map of today's visits. Pins are placed from each booking's real
 * coordinates (scaled to fit the box) and are clickable — tapping one opens the
 * navigation chooser for that client.
 */
const PIN_TONES = ['', 'blue', 'coral'];

export default function JobMap({ jobs, onPick, className = '' }) {
  const points = jobs.filter((job) => job.booking.lat && job.booking.lng);
  if (!points.length) return <div className={`map ${className} map--empty`}><span>No visits to map today.</span></div>;

  const lats = points.map((job) => job.booking.lat);
  const lngs = points.map((job) => job.booking.lng);
  const pad = 0.01;
  const [minLat, maxLat] = [Math.min(...lats) - pad, Math.max(...lats) + pad];
  const [minLng, maxLng] = [Math.min(...lngs) - pad, Math.max(...lngs) + pad];
  const position = (job) => ({
    left: `${12 + ((job.booking.lng - minLng) / (maxLng - minLng || 1)) * 76}%`,
    top: `${12 + ((maxLat - job.booking.lat) / (maxLat - minLat || 1)) * 70}%`,
  });

  return (
    <div className={`map ${className}`}>
      {points.map((job, index) => (
        <button
          key={job.id}
          type="button"
          className={`pin pin--live ${PIN_TONES[index % PIN_TONES.length]}`}
          style={position(job)}
          onClick={() => onPick(job)}
          title={`Navigate to ${job.name} · ${job.neighbourhood}`}
          aria-label={`Navigate to ${job.name}, ${job.neighbourhood}`}
        >
          <span>{index + 1}</span>
        </button>
      ))}
      {points.map((job) => <span key={`${job.id}-label`} className="map-label map-label--live" style={position(job)}>{job.neighbourhood}</span>)}
    </div>
  );
}

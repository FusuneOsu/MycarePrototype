import { BOOKING_STATUS, formatDate, formatDuration, formatMoney, navigationLinks } from '../../../../shared/bookingStore.js';
import { Button, Pill } from '../../../../shared/ui/index.js';
import JobMap from '../../components/JobMap.jsx';

// What the visit involves, by service type — a starting checklist for the caregiver.
const TASKS = {
  'Post-operative care': ['Check the wound dressing and note any redness', 'Help with mobility and safe transfers', 'Give medication as prescribed', 'Record pain level and recovery notes'],
  'Elderly care': ['Help with daily activities', 'Prepare a light meal and fluids', 'Companionship and a short walk if possible', 'Record wellbeing notes'],
  'Dementia care': ['Keep to the familiar routine', 'Supervise meals and medication', 'Calming activity or conversation', 'Note any changes in behaviour'],
  'Physiotherapy support': ['Warm-up and prescribed exercises', 'Assist with mobility aids', 'Record range of motion and effort', 'Cool-down and stretching'],
  'Wound care': ['Clean and redress the wound', 'Check for signs of infection', 'Photograph for the care record if consented', 'Record wound notes'],
  'Palliative care': ['Comfort and positioning', 'Pain and symptom check', 'Support the family', 'Record comfort notes'],
  'Paediatric care': ['Supervised play and meals', 'Medication if prescribed', 'Hand over to parent or guardian', 'Record daily notes'],
  'Medication management': ['Confirm medication against the schedule', 'Check blood pressure', 'Prepare a light breakfast', 'Record wellbeing notes'],
};

const STATUS_TONE = { [BOOKING_STATUS.confirmed]: 'success', [BOOKING_STATUS.rescheduled]: 'warning', [BOOKING_STATUS.cancelled]: 'danger', [BOOKING_STATUS.completed]: 'info' };

function Row({ label, children }) {
  return <div className="detail-row"><span>{label}</span><strong>{children || '—'}</strong></div>;
}

/**
 * One booking, as the caregiver sees it. Every field comes from the booking the
 * admin confirmed (Module 1): patient, contact, location, date/time, duration,
 * service type, status, rate/price, preferred gender and special notes.
 */
export default function JobDetailPage({ job, onBack, onNotify, onComplete, onNavigate }) {
  if (!job) {
    return <section className="page-card panel"><div className="page-intro"><div><p className="eyebrow">Past visit</p><h2>Visit details are no longer on your job list</h2><p>Completed visits and patient ratings are under Bookings &amp; ratings on your profile.</p></div><button className="back" onClick={onBack}>← Back</button></div></section>;
  }

  const { booking } = job;
  const links = navigationLinks(booking);
  const lastChange = [...booking.history].reverse().find((entry) => entry.action === BOOKING_STATUS.rescheduled || entry.action === BOOKING_STATUS.cancelled);
  const canComplete = job.active;

  return <section className="page-card panel">
    <div className="page-intro">
      <div>
        <p className="eyebrow">Booking {booking.id} · {job.dateLabel}, {booking.startTime}</p>
        <h2>{booking.serviceType}</h2>
        <p>{booking.patientName} · {job.neighbourhood}</p>
      </div>
      <div className="job-actions">
        {job.active && <Button variant="primary" size="sm" onClick={() => onNavigate(job)}>Navigate ↗</Button>}
        <button className="back" onClick={onBack}>← Back to jobs</button>
      </div>
    </div>

    {booking.status === BOOKING_STATUS.cancelled && <div className="status-note status-note--warn job-banner"><strong>This booking was cancelled</strong><p>{lastChange?.reason || 'Cancelled by your coordinator.'} You don't need to attend.</p></div>}
    {booking.status === BOOKING_STATUS.rescheduled && lastChange && <div className="status-note job-banner job-banner--moved"><strong>Rescheduled from {formatDate(lastChange.from.date)}, {lastChange.from.startTime}</strong><p>Reason: {lastChange.reason}</p></div>}

    <div className="detail-grid">
      <div className="detail-block">
        <h3>Patient</h3>
        <Row label="Name">{booking.patientName}</Row>
        <Row label="Contact number"><a className="job-link" href={`tel:${booking.patientPhone.replace(/[^\d+]/g, '')}`}>{booking.patientPhone}</a></Row>
        <Row label="Requested caregiver">{booking.preferredGender === 'No preference' ? 'No gender preference' : `${booking.preferredGender} caregiver`}</Row>
        <Row label="Request">{booking.requestId} · {booking.source}</Row>
      </div>

      <div className="detail-block">
        <h3>Visit</h3>
        <Row label="Status"><Pill tone={STATUS_TONE[booking.status]}>{booking.status}</Pill></Row>
        <Row label="Date">{formatDate(booking.date)}</Row>
        <Row label="Time">{booking.startTime}–{booking.endTime}</Row>
        <Row label="Duration">{formatDuration(booking.durationMins)}</Row>
        <Row label="Service type">{booking.serviceType}</Row>
      </div>

      <div className="detail-block detail-block--wide job-location">
        <h3>Location</h3>
        <div className="job-location__body">
          <JobMap jobs={[job]} onPick={onNavigate} className="job-location__map" />
          <div>
            <p className="job-address">{booking.address}</p>
            <div className="job-nav-buttons">
              <Button variant="primary" size="sm" href={links.google} target="_blank" rel="noreferrer">Google Maps</Button>
              <Button size="sm" href={links.waze} target="_blank" rel="noreferrer">Waze</Button>
              <Button size="sm" href={links.apple} target="_blank" rel="noreferrer">Apple Maps</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-block">
        <h3>Special notes</h3>
        <p className="job-notes">{booking.notes || 'No special notes from the patient.'}</p>
      </div>

      <div className="detail-block">
        <h3>Care checklist</h3>
        <div className="checklist">{(TASKS[booking.serviceType] || TASKS['Elderly care']).map((task) => <label key={task}><input type="checkbox" disabled={!canComplete} /> {task}</label>)}</div>
      </div>
    </div>

    <div className="payment">
      <div className="payment-head"><h3>Payment</h3><strong>{formatMoney(booking.caregiverPayout)}</strong></div>
      <p>Your payout for this visit · booking price {formatMoney(booking.price)} at {formatMoney(booking.rate)}/hour · receipt: {booking.receiptStatus.toLowerCase()} · payout: {booking.payoutStatus.toLowerCase()}.</p>
      <div className="job-actions">
        {canComplete && <button onClick={() => { onComplete(booking.id); onNotify('Visit marked complete — your coordinator will verify the receipt'); }}>Mark visit complete</button>}
        {booking.status === BOOKING_STATUS.completed && <Pill tone="success">Visit completed</Pill>}
        <button className="back" onClick={() => { onNotify('Preparing payment statement PDF'); window.setTimeout(() => window.print(), 350); }}>Payment statement PDF</button>
      </div>
    </div>
  </section>;
}

import { useMemo } from 'react';
import { Button } from '../../../../shared/ui/index.js';
import { formatDateLabel, formatTimeRange, STATUS_COLORS, toISODate, toDateObject, addDays } from '../../utils/appointmentUtils.js';
import StatusPill from '../caregivers/StatusPill/StatusPill.jsx';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** Convert appointment start/end times to CSS top/height values in pixels. */
function appointmentToPosition(appt) {
  const [sh, sm] = appt.startTime.split(':').map(Number);
  const [eh, em] = appt.endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  return {
    top: (startMins / 60) * 60,
    height: Math.max(((endMins - startMins) / 60) * 60, 20),
  };
}

/**
 * Day timeline view — shows a 24-hour grid with appointment blocks.
 *
 * Props:
 *   appointments       – appointments for the selected day (sorted)
 *   selectedDate       – currently selected ISO date string
 *   onDateChange       – called with a new ISO date to navigate
 *   onAppointmentClick – called with the appointment object when tapped
 */
export default function DayView({ appointments, selectedDate, onDateChange, onAppointmentClick }) {
  const currentTimePosition = useMemo(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  }, []);

  return (
    <div className="appointments-page__day-panel">
      <div className="appointments-page__day-header">
        <h3>{formatDateLabel(selectedDate)}</h3>
        <div className="appointments-page__day-date-controls">
          <Button size="sm" aria-label="Previous day"
            onClick={() => onDateChange(toISODate(addDays(toDateObject(selectedDate), -1)))}>
            {'\u2039'}
          </Button>
          <Button size="sm" onClick={() => onDateChange(toISODate(new Date()))}>Today</Button>
          <Button size="sm" aria-label="Next day"
            onClick={() => onDateChange(toISODate(addDays(toDateObject(selectedDate), 1)))}>
            {'\u203a'}
          </Button>
        </div>
      </div>

      <div className="appointments-page__hour-grid">
        <div className="appointments-page__hour-labels">
          {HOURS.map((h) => (
            <div key={h} className="appointments-page__hour-label">
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        <div className="appointments-page__hour-body">
          {HOURS.map((h) => <div key={h} className="appointments-page__hour-slot" />)}
          <div
            className="appointments-page__current-time-line"
            style={{ top: (currentTimePosition / 60) * 60 + 'px' }}
          />
          {appointments.map((appt) => {
            const { top, height } = appointmentToPosition(appt);
            const sc = STATUS_COLORS[appt.status] || 'var(--color-primary)';
            return (
              <div
                key={appt.id}
                className="appointments-page__hour-appointment"
                style={{ top: top + 'px', height: height + 'px', borderLeft: '4px solid ' + sc }}
                onClick={() => onAppointmentClick(appt)}
              >
                <div className="appointments-page__hour-appt-header">
                  <strong>{appt.patientName}</strong>
                  <StatusPill status={appt.status} />
                </div>
                <div className="appointments-page__hour-appt-meta">
                  <span>{formatTimeRange(appt.startTime, appt.endTime)}</span>
                  <span>{appt.caregiverName}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { monthGridFor } from '../../utils/appointmentUtils.js';

/**
 * Month calendar grid — shows 6 weeks with mini appointment pills on each day.
 *
 * Props:
 *   appointments  – filtered appointments array (used to count per-day entries)
 *   selectedDate  – currently selected ISO date string
 *   onSelectDate  – called when a day is clicked
 *   onViewDay     – called to switch to day view for a specific date
 */
export default function MonthView({ appointments, selectedDate, onSelectDate, onViewDay }) {
  const [hoveredDate, setHoveredDate] = useState(null);
  const monthGrid = useMemo(() => monthGridFor(selectedDate), [selectedDate]);

  return (
    <div className="appointments-page__calendar-grid">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((l) => (
        <div key={l} className="appointments-page__weekday-header">{l}</div>
      ))}
      {monthGrid.map((day) => {
        const dayAppts = appointments.filter((a) => a.date === day.date);
        const isHov = hoveredDate === day.date;
        const total = dayAppts.length;
        return (
          <div
            key={day.date}
            className={[
              'appointments-page__day-cell',
              day.date === selectedDate ? 'appointments-page__day-cell--selected' : '',
              day.inMonth ? '' : 'appointments-page__day-cell--muted',
              isHov && day.inMonth ? 'appointments-page__day-cell--hovered' : '',
            ].filter(Boolean).join(' ')}
            onMouseEnter={() => day.inMonth && setHoveredDate(day.date)}
            onMouseLeave={() => setHoveredDate(null)}
            onClick={() => { onSelectDate(day.date); onViewDay(day.date); }}
          >
            <div className="appointments-page__day-topline">
              <span className={day.isToday ? 'appointments-page__day-number--today' : ''}>
                {day.dayNumber}
                {day.isToday && <span className="appointments-page__today-dot" />}
              </span>
              {day.isToday && <span className="appointments-page__day-badge">Today</span>}
            </div>
            {dayAppts.length > 0 && (
              <div className="appointments-page__day-stack">
                {dayAppts.slice(0, 3).map((a) => (
                  <span key={a.id} className="appointments-page__mini-pill">
                    {a.startTime} &middot; {a.patientName.split(' ')[0]}
                  </span>
                ))}
                {total > 3 && <span className="appointments-page__mini-pill">+{total - 3} more</span>}
                <span className="appointments-page__total-count">{total} total</span>
              </div>
            )}
            {day.inMonth && total > 0 && <span className="appointments-page__see-details">See details</span>}
          </div>
        );
      })}
    </div>
  );
}

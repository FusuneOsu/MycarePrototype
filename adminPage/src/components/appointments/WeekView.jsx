import { useState, useMemo } from 'react';
import { weekGridFor } from '../../utils/appointmentUtils.js';

/**
 * Week calendar grid — shows 7 days with appointment chips and totals.
 *
 * Props:
 *   appointments  – filtered appointments array
 *   selectedDate  – currently selected ISO date string
 *   onSelectDate  – called when a day is clicked
 *   onViewDay     – called to switch to day view for a specific date
 */
export default function WeekView({ appointments, selectedDate, onSelectDate, onViewDay }) {
  const [hoveredDate, setHoveredDate] = useState(null);
  const weekGrid = useMemo(() => weekGridFor(selectedDate), [selectedDate]);

  return (
    <div className="appointments-page__week-grid">
      {weekGrid.map((day) => {
        const dayAppts = appointments.filter((a) => a.date === day.date);
        const isHov = hoveredDate === day.date;
        const total = dayAppts.length;
        return (
          <div
            key={day.date}
            className={[
              'appointments-page__week-day',
              day.date === selectedDate ? 'appointments-page__week-day--selected' : '',
              isHov ? 'appointments-page__week-day--hovered' : '',
            ].filter(Boolean).join(' ')}
            onMouseEnter={() => setHoveredDate(day.date)}
            onMouseLeave={() => setHoveredDate(null)}
            onClick={() => onSelectDate(day.date)}
          >
            <div className="appointments-page__week-day-header">
              <span>{day.label}</span>
              <strong className={day.isToday ? 'appointments-page__week-day-number--today' : ''}>
                {day.dayNumber}
                {day.isToday && <span className="appointments-page__today-dot" />}
              </strong>
            </div>
            <div className="appointments-page__week-day-body">
              {dayAppts.length === 0 ? (
                <span className="appointments-page__empty-text">No visits</span>
              ) : (
                <>
                  {dayAppts.slice(0, 4).map((a) => (
                    <span key={a.id} className="appointments-page__event-chip">
                      {a.startTime} &middot; {a.patientName}
                    </span>
                  ))}
                  {total > 0 && <span className="appointments-page__total-count">{total} total</span>}
                </>
              )}
            </div>
            {total > 0 && (
              <button
                type="button"
                className="appointments-page__see-details-btn"
                onClick={(e) => { e.stopPropagation(); onViewDay(day.date); }}
              >
                See details
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { getAllAppointments } from '../data/mockAppointments.js';

export const DURATIONS = [45, 60, 90, 120, 180, 240];

// Dynamic calendar commitments from live bookings
export function getCalendarCommitments() {
  return getAllAppointments()
    .filter((a) => a.status !== 'Cancelled' && a.caregiverId && a.caregiverId !== 'UNASSIGNED')
    .map((a) => ({ id: a.id, caregiverId: a.caregiverId, date: a.date, startTime: a.startTime, endTime: a.endTime }));
}

// Export getter property or function for backwards compatibility
export const calendarCommitments = {
  filter: (...args) => getCalendarCommitments().filter(...args),
  map: (...args) => getCalendarCommitments().map(...args),
  [Symbol.iterator]: () => getCalendarCommitments()[Symbol.iterator](),
  length: 0,
};

export const when = (iso) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function Row({ label, children }) {
  return <div className="request-row"><span>{label}</span><strong>{children || '—'}</strong></div>;
}

export function Check({ ok, children }) {
  return <span className={ok ? 'match-check match-check--ok' : 'match-check'}>{ok ? '✓' : '✕'} {children}</span>;
}

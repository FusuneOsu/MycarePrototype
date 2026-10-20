import { mockAppointments } from '../data/mockAppointments.js';

export const DURATIONS = [45, 60, 90, 120, 180, 240];

// Calendar appointments also occupy caregivers, so the finder clash-checks them too.
export const calendarCommitments = mockAppointments
  .filter((a) => a.status !== 'Cancelled' && a.caregiverId && a.caregiverId !== 'UNASSIGNED')
  .map((a) => ({ id: a.id, caregiverId: a.caregiverId, date: a.date, startTime: a.startTime, endTime: a.endTime }));

export const when = (iso) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function Row({ label, children }) {
  return <div className="request-row"><span>{label}</span><strong>{children || '—'}</strong></div>;
}

export function Check({ ok, children }) {
  return <span className={ok ? 'match-check match-check--ok' : 'match-check'}>{ok ? '✓' : '✕'} {children}</span>;
}

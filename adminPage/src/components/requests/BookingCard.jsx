import { useState } from 'react';
import StatusPill from '../caregivers/StatusPill/StatusPill.jsx';
import { DURATIONS, when, Row } from '../../utils/patientRequestUtils.jsx';
import {
  BOOKING_STATUS, rescheduleBooking, cancelBooking, listNotifications,
  formatDate, formatDuration, formatMoney
} from '../../../../shared/bookingStore.js';
import { Button, Card, Field, Input, Pill, SectionHeader, Select, Textarea } from '../../../../shared/ui/index.js';

/**
 * Booking detail card — shows the booking record with reschedule / cancel.
 *
 * Props:
 *   booking   — booking object from bookingStore
 *   onChanged — callback after any mutation
 */
export default function BookingCard({ booking, onChanged }) {
  const [mode, setMode] = useState('');
  const [form, setForm] = useState({
    date: booking.date,
    startTime: booking.startTime,
    durationMins: booking.durationMins,
    reason: '',
  });
  const notifications = listNotifications({ bookingId: booking.id });
  const editable = booking.status === BOOKING_STATUS.confirmed || booking.status === BOOKING_STATUS.rescheduled;

  const reschedule = () => {
    rescheduleBooking(booking.id, { ...form, reason: form.reason.trim() });
    setMode('');
    onChanged();
  };
  const cancel = () => {
    cancelBooking(booking.id, form.reason.trim());
    setMode('');
    onChanged();
  };

  return (
    <Card padded>
      <SectionHeader
        eyebrow={`Booking · ${booking.id}`}
        title={booking.caregiverName}
        actions={<StatusPill status={booking.status} />}
      />
      <Row label="Patient">{booking.patientName} · {booking.patientPhone}</Row>
      <Row label="Caregiver">{booking.caregiverName} · {booking.caregiverId}</Row>
      <Row label="Date">{formatDate(booking.date)}</Row>
      <Row label="Time">{booking.startTime}–{booking.endTime}</Row>
      <Row label="Duration">{formatDuration(booking.durationMins)}</Row>
      <Row label="Location">{booking.address}</Row>
      <Row label="Service type">{booking.serviceType}</Row>
      <Row label="Rate">{formatMoney(booking.rate)} / hour</Row>
      <Row label="Price">{formatMoney(booking.price)}</Row>

      {editable && !mode && (
        <div className="request-actions">
          <Button size="sm" onClick={() => setMode('reschedule')}>Reschedule</Button>
          <Button variant="danger" size="sm" onClick={() => setMode('cancel')}>Cancel booking</Button>
        </div>
      )}
      {mode === 'reschedule' && (
        <div className="booking-form">
          <div className="booking-form__grid">
            <Field label="New date"><Input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} /></Field>
            <Field label="Start"><Input type="time" value={form.startTime} onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))} /></Field>
            <Field label="Duration">
              <Select value={form.durationMins} onChange={(e) => setForm((prev) => ({ ...prev, durationMins: Number(e.target.value) }))}>
                {[...new Set([...DURATIONS, booking.durationMins])].sort((a, b) => a - b).map((mins) => (
                  <option key={mins} value={mins}>{formatDuration(mins)}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Textarea rows={2} value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Reason for rescheduling (sent to both parties)" aria-label="Reason for rescheduling" />
          <div className="request-actions">
            <Button size="sm" onClick={() => setMode('')}>Back</Button>
            <Button variant="primary" size="sm" disabled={!form.reason.trim()} onClick={reschedule}>Save new time</Button>
          </div>
        </div>
      )}
      {mode === 'cancel' && (
        <div className="booking-form">
          <Textarea rows={2} value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Reason for cancelling (sent to both parties)" aria-label="Reason for cancelling" />
          <div className="request-actions">
            <Button size="sm" onClick={() => setMode('')}>Back</Button>
            <Button variant="danger" size="sm" disabled={!form.reason.trim()} onClick={cancel}>Cancel booking</Button>
          </div>
        </div>
      )}

      <h4 className="booking-subhead">History</h4>
      <ul className="booking-log">
        {[...booking.history].reverse().map((entry, index) => (
          <li key={`${entry.at}-${index}`}>
            <strong>{entry.action}</strong> · {when(entry.at)}
            {entry.from && <span> · from {formatDate(entry.from.date)} {entry.from.startTime}</span>}
            {entry.reason && <em>"{entry.reason}"</em>}
          </li>
        ))}
      </ul>

      <h4 className="booking-subhead">Notifications sent</h4>
      {notifications.length === 0 ? <p className="finder-hint">None yet.</p> : (
        <ul className="booking-log">
          {notifications.map((item) => (
            <li key={item.id}>
              <Pill tone={item.channel === 'WhatsApp' ? 'success' : 'info'}>{item.channel}</Pill>
              {' '}<strong>{item.audience === 'patient' ? 'Patient' : 'Caregiver'}</strong> · {item.title} · {when(item.at)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

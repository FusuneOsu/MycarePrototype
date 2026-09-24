import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import { listBookableCaregivers } from '../../data/caregiverAccounts.js';
import { mockAppointments } from '../../data/mockAppointments.js';
import { formatRating } from '../../../../shared/bookingHistory.js';
import {
  BOOKING_STATUS, REQUEST_STATUS, SERVICE_RATES, cancelBooking, confirmBooking, endTimeOf, filterMatches,
  formatDate, formatDuration, formatMoney, getBooking, getRequest, listBookings, listNotifications,
  matchCaregivers, navigationLinks, priceFor, rescheduleBooking, setRequestStatus, updateBookingPayment, editPatientRequest
} from '../../../../shared/bookingStore.js';
import { Button, Card, CellStack, Field, Input, Pill, SectionHeader, Segmented, Select, Table, Tag, Textarea } from '../../../../shared/ui/index.js';
import AssignCaregiverModal from '../../components/caregivers/AssignCaregiverModal/AssignCaregiverModal.jsx';
import './PatientRequestPage.css';

const DURATIONS = [45, 60, 90, 120, 180, 240];

// Calendar appointments also occupy caregivers, so the finder clash-checks them too.
const calendarCommitments = mockAppointments
  .filter((appointment) => appointment.status !== 'Cancelled' && appointment.caregiverId && appointment.caregiverId !== 'UNASSIGNED')
  .map((appointment) => ({ id: appointment.id, caregiverId: appointment.caregiverId, date: appointment.date, startTime: appointment.startTime, endTime: appointment.endTime }));

const when = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function Row({ label, children }) {
  return <div className="request-row"><span>{label}</span><strong>{children || '—'}</strong></div>;
}

function Check({ ok, children }) {
  return <span className={ok ? 'match-check match-check--ok' : 'match-check'}>{ok ? '✓' : '✕'} {children}</span>;
}

/* The request: every Module 1 intake field, plus review / reject actions ---------- */
function RequestCard({ request, onChanged }) {
  const [rejecting, setRejecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState('');
  const [editForm, setEditForm] = useState({ 
    patientName: request.patientName, 
    phone: request.phone, 
    careType: request.careType, 
    preferredGender: request.preferredGender, 
    area: request.area,
    address: request.address
  });
  const links = navigationLinks(request);
  const open = request.status === REQUEST_STATUS.new || request.status === REQUEST_STATUS.review;

  const handleEditSubmit = () => {
    editPatientRequest(request.id, editForm);
    setEditing(false);
    onChanged();
  };

  return (
    <Card padded className="request-card">
      <SectionHeader eyebrow={`${request.source} request · ${request.id}`} title={request.patientName} actions={<StatusPill status={request.status} />} />
      
      {!editing ? (
        <>
          <div className="request-grid">
            <Row label="Contact number">{request.phone}</Row>
            <Row label="Care type needed">{request.careType}</Row>
            <Row label="Preferred date">{formatDate(request.preferredDate)}</Row>
            <Row label="Preferred time">{request.preferredStart}–{endTimeOf(request.preferredStart, request.durationMins)} ({formatDuration(request.durationMins)})</Row>
            <Row label="Preferred caregiver gender">{request.preferredGender}</Row>
            <Row label="Zone">{request.area}</Row>
            <div className="request-row request-row--full"><span>Address</span><strong>{request.address} <a className="request-map-link" href={links.google} target="_blank" rel="noreferrer">View map ↗</a></strong></div>
          </div>
          <div className="request-note"><span>Special notes</span><p>{request.notes || 'None'}</p></div>
          {request.statusReason && <div className="request-reason"><strong>{request.status === REQUEST_STATUS.rejected ? 'Rejected' : 'Note'}:</strong> {request.statusReason}</div>}

          {open && (
            <div className="request-actions">
              <Button size="sm" onClick={() => setEditing(true)}>Edit request</Button>
              {request.status === REQUEST_STATUS.new && <Button size="sm" onClick={() => { setRequestStatus(request.id, REQUEST_STATUS.review); onChanged(); }}>Mark as in review</Button>}
              {!rejecting && <Button variant="danger" size="sm" onClick={() => setRejecting(true)}>Reject request</Button>}
            </div>
          )}
          {open && rejecting && (
            <div className="request-reject">
              <Textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for rejecting (sent to the patient)" aria-label="Reason for rejecting" />
              <div className="request-actions">
                <Button size="sm" onClick={() => setRejecting(false)}>Cancel</Button>
                <Button variant="danger" size="sm" disabled={!reason.trim()} onClick={() => { setRequestStatus(request.id, REQUEST_STATUS.rejected, reason.trim()); onChanged(); }}>Confirm rejection</Button>
              </div>
            </div>
          )}
          {request.status === REQUEST_STATUS.rejected && (
            <div className="request-actions"><Button size="sm" onClick={() => { setRequestStatus(request.id, REQUEST_STATUS.review, ''); onChanged(); }}>Reopen request</Button></div>
          )}
        </>
      ) : (
        <div className="request-edit-form">
          <Field label="Patient Name">
            <Input value={editForm.patientName} onChange={(e) => setEditForm(prev => ({...prev, patientName: e.target.value}))} />
          </Field>
          <Field label="Contact Number">
            <Input value={editForm.phone} onChange={(e) => setEditForm(prev => ({...prev, phone: e.target.value}))} />
          </Field>
          <Field label="Care Type Needed">
            <Input value={editForm.careType} onChange={(e) => setEditForm(prev => ({...prev, careType: e.target.value}))} />
          </Field>
          <Field label="Zone (Area)">
            <Input value={editForm.area} onChange={(e) => setEditForm(prev => ({...prev, area: e.target.value}))} />
          </Field>
          <Field label="Address">
            <Textarea rows={2} value={editForm.address} onChange={(e) => setEditForm(prev => ({...prev, address: e.target.value}))} />
          </Field>
          <Field label="Preferred Caregiver Gender">
            <Select value={editForm.preferredGender} onChange={(e) => setEditForm(prev => ({...prev, preferredGender: e.target.value}))}>
              <option value="No preference">Up to Admin (No preference)</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
          </Field>
          <div className="request-actions" style={{ marginTop: '16px' }}>
            <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleEditSubmit}>Save changes</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* Find a caregiver: location / availability / gender / skill filters ------------- */
function CaregiverFinder({ request, onBooked }) {
  const [slot, setSlot] = useState({ date: request.preferredDate, startTime: request.preferredStart, durationMins: request.durationMins, rate: SERVICE_RATES[request.careType] || 40 });
  const [filters, setFilters] = useState({ location: 'zone', radiusKm: 10, availability: true, gender: request.preferredGender !== 'No preference', skill: false });
  const [selectedId, setSelectedId] = useState('');

  const setSlotField = (field) => (event) => setSlot((prev) => ({ ...prev, [field]: event.target.value }));
  const toggle = (field) => setFilters((prev) => ({ ...prev, [field]: !prev[field] }));

  const matches = matchCaregivers(request, listBookableCaregivers(), slot, calendarCommitments);
  const visible = filterMatches(matches, filters);
  const selected = visible.find((match) => match.caregiver.id === selectedId) || null;
  const price = priceFor(slot.rate, slot.durationMins);

  const confirm = () => {
    const booking = confirmBooking({ request, caregiver: selected.caregiver, date: slot.date, startTime: slot.startTime, durationMins: slot.durationMins, rate: slot.rate });
    onBooked(booking);
  };

  return (
    <Card padded className="finder">
      <SectionHeader eyebrow="Assignment" title="Find an available caregiver" intro="Filter the Active caregiver pool for this request, pick one, and confirm the booking." />

      <div className="finder-slot">
        <Field label="Date"><Input type="date" value={slot.date} onChange={setSlotField('date')} /></Field>
        <Field label="Start time"><Input type="time" value={slot.startTime} onChange={setSlotField('startTime')} /></Field>
        <Field label="Duration">
          <Select value={slot.durationMins} onChange={(event) => setSlot((prev) => ({ ...prev, durationMins: Number(event.target.value) }))}>
            {[...new Set([...DURATIONS, request.durationMins])].sort((a, b) => a - b).map((mins) => <option key={mins} value={mins}>{formatDuration(mins)}</option>)}
          </Select>
        </Field>
        <Field label="Rate (RM / hour)"><Input type="number" min="0" step="1" value={slot.rate} onChange={setSlotField('rate')} /></Field>
      </div>

      <div className="finder-filters">
        <div className="finder-filter">
          <span className="finder-filter__label">Location</span>
          <Segmented
            label="Location filter"
            value={filters.location}
            onChange={(location) => setFilters((prev) => ({ ...prev, location }))}
            options={[{ id: 'zone', label: `Covers ${request.area}` }, { id: 'radius', label: 'Within radius' }, { id: 'any', label: 'Anywhere' }]}
          />
          {filters.location === 'radius' && (
            <Select size="sm" value={filters.radiusKm} onChange={(event) => setFilters((prev) => ({ ...prev, radiusKm: Number(event.target.value) }))} aria-label="Radius">
              {[5, 10, 15, 25].map((km) => <option key={km} value={km}>{km} km</option>)}
            </Select>
          )}
        </div>
        <label className="ui-check"><input type="checkbox" checked={filters.availability} onChange={() => toggle('availability')} /> Free at this time (no clash)</label>
        <label className="ui-check"><input type="checkbox" checked={filters.gender} onChange={() => toggle('gender')} disabled={request.preferredGender === 'No preference'} /> Matches gender preference{request.preferredGender !== 'No preference' ? ` (${request.preferredGender})` : ''}</label>
        <label className="ui-check"><input type="checkbox" checked={filters.skill} onChange={() => toggle('skill')} /> Specialises in {request.careType.toLowerCase()}</label>
      </div>

      <p className="finder-count">{visible.length} of {matches.length} Active caregivers match · nearest first</p>

      <Table
        columns={['', 'Caregiver', 'Distance', 'Availability', 'Gender', 'Skill', 'Rating']}
        label="Matching caregivers"
        empty={visible.length === 0 && 'No caregiver matches every filter. Try "Within radius", another time, or turn a filter off.'}
      >
        {visible.map((match) => (
          <tr key={match.caregiver.id} onClick={() => setSelectedId(match.caregiver.id)} className={selectedId === match.caregiver.id ? 'finder-row--selected' : undefined} style={{ cursor: 'pointer' }}>
            <td><input type="radio" name="caregiver" checked={selectedId === match.caregiver.id} onChange={() => setSelectedId(match.caregiver.id)} aria-label={`Select ${match.caregiver.name}`} /></td>
            <td>
              <CellStack primary={match.caregiver.name} secondary={`${match.caregiver.id} · ${match.caregiver.center}`}>
                {match.caregiver.source === 'application' && <Tag>New</Tag>}
              </CellStack>
            </td>
            <td><CellStack primary={match.distanceKm === null ? '—' : `${match.distanceKm} km`} secondary={match.inZone ? `Covers ${request.area}` : 'Outside zone'} /></td>
            <td><Check ok={match.available}>{match.availabilityNote}</Check></td>
            <td><Check ok={match.genderMatch}>{match.caregiver.gender}</Check></td>
            <td><Check ok={match.skillMatch}>{match.skillMatch ? request.careType : 'Not listed'}</Check></td>
            <td className="ui-table__muted">{formatRating(match.caregiver.bookingSummary)}</td>
          </tr>
        ))}
      </Table>

      <div className="finder-confirm">
        <div>
          <strong>{selected ? selected.caregiver.name : 'Select a caregiver'}</strong>
          <span>{formatDate(slot.date)} · {slot.startTime}–{endTimeOf(slot.startTime, slot.durationMins)} · {formatDuration(slot.durationMins)} · {request.careType}</span>
        </div>
        <div className="finder-confirm__price"><span>Booking price</span><strong>{formatMoney(price)}</strong></div>
        <Button variant="primary" disabled={!selected || !slot.date || !slot.startTime || !(Number(slot.rate) > 0)} onClick={confirm}>Confirm booking</Button>
      </div>
      <p className="finder-hint">Confirming saves the booking, marks the request Booked, and notifies the patient on WhatsApp and the caregiver in their app.</p>
    </Card>
  );
}

/* The booking record, with reschedule / cancel ----------------------------------- */
function BookingCard({ booking, onChanged }) {
  const [mode, setMode] = useState('');
  const [form, setForm] = useState({ date: booking.date, startTime: booking.startTime, durationMins: booking.durationMins, reason: '' });
  const notifications = listNotifications({ bookingId: booking.id });
  const editable = booking.status === BOOKING_STATUS.confirmed || booking.status === BOOKING_STATUS.rescheduled;

  const reschedule = () => { rescheduleBooking(booking.id, { ...form, reason: form.reason.trim() }); setMode(''); onChanged(); };
  const cancel = () => { cancelBooking(booking.id, form.reason.trim()); setMode(''); onChanged(); };

  return (
    <Card padded>
      <SectionHeader eyebrow={`Booking · ${booking.id}`} title={booking.caregiverName} actions={<StatusPill status={booking.status} />} />
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
            <Field label="New date"><Input type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} /></Field>
            <Field label="Start"><Input type="time" value={form.startTime} onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))} /></Field>
            <Field label="Duration">
              <Select value={form.durationMins} onChange={(event) => setForm((prev) => ({ ...prev, durationMins: Number(event.target.value) }))}>
                {[...new Set([...DURATIONS, booking.durationMins])].sort((a, b) => a - b).map((mins) => <option key={mins} value={mins}>{formatDuration(mins)}</option>)}
              </Select>
            </Field>
          </div>
          <Textarea rows={2} value={form.reason} onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} placeholder="Reason for rescheduling (sent to both parties)" aria-label="Reason for rescheduling" />
          <div className="request-actions"><Button size="sm" onClick={() => setMode('')}>Back</Button><Button variant="primary" size="sm" disabled={!form.reason.trim()} onClick={reschedule}>Save new time</Button></div>
        </div>
      )}
      {mode === 'cancel' && (
        <div className="booking-form">
          <Textarea rows={2} value={form.reason} onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} placeholder="Reason for cancelling (sent to both parties)" aria-label="Reason for cancelling" />
          <div className="request-actions"><Button size="sm" onClick={() => setMode('')}>Back</Button><Button variant="danger" size="sm" disabled={!form.reason.trim()} onClick={cancel}>Cancel booking</Button></div>
        </div>
      )}

      <h4 className="booking-subhead">History</h4>
      <ul className="booking-log">
        {[...booking.history].reverse().map((entry, index) => (
          <li key={`${entry.at}-${index}`}>
            <strong>{entry.action}</strong> · {when(entry.at)}
            {entry.from && <span> · from {formatDate(entry.from.date)} {entry.from.startTime}</span>}
            {entry.reason && <em>“{entry.reason}”</em>}
          </li>
        ))}
      </ul>

      <h4 className="booking-subhead">Notifications sent</h4>
      {notifications.length === 0 ? <p className="finder-hint">None yet.</p> : (
        <ul className="booking-log">
          {notifications.map((item) => (
            <li key={item.id}><Pill tone={item.channel === 'WhatsApp' ? 'success' : 'info'}>{item.channel}</Pill> <strong>{item.audience === 'patient' ? 'Patient' : 'Caregiver'}</strong> · {item.title} · {when(item.at)}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PaymentCard({ booking, onChanged }) {
  const [message, setMessage] = useState('');

  const createPaymentLink = async () => {
    setMessage('Creating secure payment link...');
    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: booking.requestId, bookingId: booking.id, amountCents: Math.round(booking.price * 100), currency: 'myr', description: `${booking.serviceType} for ${booking.patientName}` }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Payment link could not be created.');
      if (result.demo) { setMessage('Demo mode: add STRIPE_SECRET_KEY to create a real Stripe test link.'); return; }
      setMessage('Payment link created.');
      window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <Card padded>
      <SectionHeader eyebrow="Payment" title="Service payment" />
      <div className="payment-amount"><span>Patient pays</span><strong>{formatMoney(booking.price)}</strong></div>
      <div className="payment-row"><span>Receipt</span><StatusPill status={booking.receiptStatus} /></div>
      <div className="payment-row"><span>Caregiver payout · {formatMoney(booking.caregiverPayout)}</span><StatusPill status={booking.payoutStatus} /></div>
      <div className="payment-actions">
        <Button block onClick={createPaymentLink}>Create patient payment link</Button>
        {message && <p className="finder-hint">{message}</p>}
        <Button block disabled={booking.receiptStatus === 'Receipt verified'} onClick={() => { updateBookingPayment(booking.id, { receiptStatus: 'Receipt verified' }); onChanged(); }}>Mark receipt verified</Button>
        <Button variant="primary" block disabled={booking.receiptStatus !== 'Receipt verified' || booking.payoutStatus === 'Paid to caregiver'} onClick={() => { updateBookingPayment(booking.id, { payoutStatus: 'Paid to caregiver' }); onChanged(); }}>
          {booking.payoutStatus === 'Paid to caregiver' ? 'Caregiver paid' : 'Release caregiver payment'}
        </Button>
      </div>
    </Card>
  );
}

function PatientRequestPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  // Bumped to re-read the store after any change here or in the caregiver app.
  const [, setVersion] = useState(0);
  const [flash, setFlash] = useState('');
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  // The caregiver app writes to the same store (e.g. marking a visit complete).
  useEffect(() => {
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); };
  }, [refresh]);

  // Cheap localStorage reads, done on every render so they are never stale.
  const request = getRequest(requestId);
  const booking = request?.bookingId ? getBooking(request.bookingId) : null;
  const cancelled = request ? listBookings().filter((item) => item.requestId === request.id && item.status === BOOKING_STATUS.cancelled) : [];

  const back = <Button onClick={() => navigate('/requests')}>← Back to requests</Button>;

  if (!request) {
    return (
      <div className="patient-request-page">
        <Topbar title="Patient request" subtitle="Review the intake before assigning care." actions={back} />
        <Card padded><SectionHeader eyebrow={requestId} title="Request not found" intro="This conversation hasn't been turned into a request yet, or the link is out of date." /></Card>
      </div>
    );
  }

  const bookable = request.status === REQUEST_STATUS.new || request.status === REQUEST_STATUS.review;

  const markReceiptVerified = () => {
    const next = writeRequestOverrides(requestId, { receiptStatus: 'Receipt verified' });
    setStoredRequest({ ...storedRequest, ...next });
  };

  const releaseCaregiverPayment = () => {
    const next = writeRequestOverrides(requestId, { payoutStatus: 'Paid to caregiver' });
    setStoredRequest({ ...storedRequest, ...next });
  };

  return (
    <div className="patient-request-page">
      <Topbar title="Patient request" subtitle="Review the intake, find an available caregiver, and confirm the booking." actions={back} />
      {flash && <div className="ui-banner request-flash" role="status">{flash}</div>}

      <section className="patient-request-page__grid">
        <RequestCard key={`${request.id}-${request.status}`} request={request} onChanged={refresh} />
        <div className="patient-request-page__side">
          {booking ? (
            <>
              <BookingCard key={`${booking.id}-${booking.updatedAt}`} booking={booking} onChanged={refresh} />
              <PaymentCard booking={booking} onChanged={refresh} />
            </>
          ) : (
            <Card padded variant="tint">
              <SectionHeader eyebrow="Booking" title="Not booked yet" intro={bookable ? 'Use the caregiver finder below to confirm a booking.' : 'Reopen the request to book it.'} />
              {cancelled.length > 0 && <p className="finder-hint">Previously cancelled: {cancelled.map((item) => `${item.id} (${item.history.at(-1)?.reason})`).join('; ')}</p>}
            </Card>
          )}
        </div>
      </section>

      {bookable && !booking && (
        <CaregiverFinder
          key={request.id}
          request={request}
          onBooked={(created) => { setFlash(`Booking ${created.id} confirmed with ${created.caregiverName}. WhatsApp confirmation sent to ${created.patientName}; ${created.caregiverName} has been notified.`); refresh(); }}
        />
      )}
    </div>
  );
}

export default PatientRequestPage;


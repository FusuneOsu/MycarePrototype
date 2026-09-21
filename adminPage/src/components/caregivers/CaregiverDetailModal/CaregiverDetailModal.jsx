import { useState } from 'react';
import Modal from '../../common/Modal/Modal.jsx';
import StatusPill from '../StatusPill/StatusPill.jsx';
import { ACCOUNT_STATUS } from '../../../data/caregiverAccounts.js';
import { ACCOUNT_HOLDS } from '../../../../../shared/careVocabulary.js';
import { formatRating } from '../../../../../shared/bookingHistory.js';
import './CaregiverDetailModal.css';

const TABS = ['Overview', 'Personal details', 'Skills', 'Availability', 'Documents', 'Bookings'];

const show = (value) => (Array.isArray(value) ? value.join(', ') : value) || '—';
const date = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function DetailRow({ label, value, children }) {
  return (
    <div className="caregiver-detail-modal__row">
      <span className="caregiver-detail-modal__label">{label}</span>
      <span className="caregiver-detail-modal__value">{children ?? show(value)}</span>
    </div>
  );
}

/**
 * The admin's view of a caregiver profile: personal details, documents,
 * booking history with ratings, and current status — plus the suspend /
 * deactivate controls that take someone out of the booking pool without
 * deleting their record.
 */
function CaregiverDetailModal({ isOpen, onClose, caregiver, onHold, onRelease }) {
  const [tab, setTab] = useState(TABS[0]);
  const [holdState, setHoldState] = useState(ACCOUNT_HOLDS[0]);
  const [reason, setReason] = useState('');

  if (!caregiver) return null;

  const onHoldNow = Boolean(caregiver.hold);
  const canHold = caregiver.accountStatus === ACCOUNT_STATUS.active;
  const summary = caregiver.bookingSummary || { completed: 0, rated: 0, averageRating: null };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={caregiver.name} size="lg">
      <div className="caregiver-detail-modal">
        <div className="caregiver-detail-modal__summary">
          <StatusPill status={caregiver.accountStatus} />
          {caregiver.availability && !onHoldNow && <StatusPill status={caregiver.availability} />}
          <span className="caregiver-detail-modal__meta">{caregiver.id} · {caregiver.center || 'No center'} · {formatRating(summary)} · {summary.completed} completed</span>
        </div>

        <div className="caregiver-detail-modal__tabs" role="tablist">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              className={'caregiver-detail-modal__tab' + (tab === name ? ' caregiver-detail-modal__tab--on' : '')}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="caregiver-detail-modal__panel" role="tabpanel">
          {tab === 'Overview' && (
            <>
              <section className="caregiver-detail-modal__section">
                <h3>Current status</h3>
                <DetailRow label="Account"><StatusPill status={caregiver.accountStatus} /></DetailRow>
                <DetailRow label="Booking pool" value={caregiver.accountStatus === ACCOUNT_STATUS.active ? 'Visible to the booking engine' : 'Not offered to patients'} />
                <DetailRow label="Availability" value={onHoldNow ? '—' : caregiver.availability} />
                {onHoldNow && <DetailRow label={`${caregiver.hold.state} since`} value={date(caregiver.hold.since)} />}
                {onHoldNow && <DetailRow label="Reason" value={caregiver.hold.reason} />}
                <DetailRow label="Joined" value={date(caregiver.joinedOn)} />
                <DetailRow label="Source" value={{ application: 'Applied online', manual: 'Added by admin', directory: 'Existing directory' }[caregiver.source]} />
              </section>

              <section className="caregiver-detail-modal__section">
                <h3>Assignment</h3>
                <DetailRow label="Center" value={caregiver.center} />
                <DetailRow label="Username" value={caregiver.username} />
                <DetailRow label="Auto-assigned" value={caregiver.autoAssigned} />
                <DetailRow label="Manager" value={caregiver.managerName ? `${caregiver.managerName} · ${caregiver.managerId}` : 'Not assigned'} />
              </section>

              {onHoldNow && (
                <section className="caregiver-detail-modal__section caregiver-detail-modal__hold">
                  <h3>Reactivate</h3>
                  <p className="caregiver-detail-modal__hint">Returns {caregiver.name.split(' ')[0]} to the booking pool as Active.</p>
                  <button type="button" className="caregiver-detail-modal__btn caregiver-detail-modal__btn--primary" onClick={() => onRelease(caregiver)}>
                    Reactivate caregiver
                  </button>
                </section>
              )}

              {canHold && (
                <section className="caregiver-detail-modal__section caregiver-detail-modal__hold">
                  <h3>Remove from booking pool</h3>
                  <p className="caregiver-detail-modal__hint">The record, documents and booking history are kept. You can reactivate at any time.</p>
                  <div className="caregiver-detail-modal__choice">
                    {ACCOUNT_HOLDS.map((state) => (
                      <label key={state}>
                        <input type="radio" name="hold-state" checked={holdState === state} onChange={() => setHoldState(state)} />
                        <span><strong>{state}</strong> {state === 'Suspended' ? '— temporary, e.g. extended leave' : '— offboarded'}</span>
                      </label>
                    ))}
                  </div>
                  <textarea
                    className="caregiver-detail-modal__textarea"
                    rows={2}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Reason (required) — shown to the caregiver"
                  />
                  <button
                    type="button"
                    className="caregiver-detail-modal__btn caregiver-detail-modal__btn--danger"
                    disabled={!reason.trim()}
                    onClick={() => onHold(caregiver, holdState, reason.trim())}
                  >
                    {holdState === 'Suspended' ? 'Suspend caregiver' : 'Deactivate caregiver'}
                  </button>
                </section>
              )}
            </>
          )}

          {tab === 'Personal details' && (
            <section className="caregiver-detail-modal__section">
              <DetailRow label="Full name" value={caregiver.name} />
              <DetailRow label="Gender" value={caregiver.gender} />
              <DetailRow label="Email" value={caregiver.email} />
              <DetailRow label="Phone" value={caregiver.phone} />
              <DetailRow label="IC / passport" value={caregiver.idNumber} />
              <DetailRow label="Date of birth" value={caregiver.dob} />
              <DetailRow label="Home address" value={caregiver.address} />
              <DetailRow label="Emergency contact" value={caregiver.emergencyContact} />
            </section>
          )}

          {tab === 'Skills' && (
            <section className="caregiver-detail-modal__section">
              <DetailRow label="Experience" value={caregiver.experienceBand} />
              <DetailRow label="Previous employer" value={caregiver.previousEmployer} />
              <DetailRow label="Specialisations" value={caregiver.specialisations} />
              <DetailRow label="Languages" value={caregiver.languages} />
              <DetailRow label="Introduction" value={caregiver.bio} />
            </section>
          )}

          {tab === 'Availability' && (
            <section className="caregiver-detail-modal__section">
              <DetailRow label="Coverage areas" value={caregiver.coverageAreas} />
              <DetailRow label="Working days" value={caregiver.workingDays} />
              <DetailRow label="Shift / hours" value={caregiver.shift} />
              <DetailRow label="Travel mode" value={caregiver.travelMode} />
              <DetailRow label="Work accommodations" value={caregiver.workAccommodations} />
            </section>
          )}

          {tab === 'Documents' && (
            <section className="caregiver-detail-modal__section">
              {caregiver.documentList?.length ? caregiver.documentList.map((document) => (
                <DetailRow key={document.label} label={document.label}>
                  <span>{document.file}</span> <StatusPill status={document.status} />
                </DetailRow>
              )) : <p className="caregiver-detail-modal__hint">No documents on file. This caregiver was added before online onboarding.</p>}
            </section>
          )}

          {tab === 'Bookings' && (
            <section className="caregiver-detail-modal__section">
              <div className="caregiver-detail-modal__stats">
                <div><strong>{summary.completed}</strong><span>Completed bookings</span></div>
                <div><strong>{summary.averageRating === null ? '—' : summary.averageRating.toFixed(1)}</strong><span>Average rating{summary.rated ? ` (${summary.rated})` : ''}</span></div>
              </div>
              {caregiver.bookings?.length ? caregiver.bookings.map((booking) => (
                <div className="caregiver-detail-modal__booking" key={booking.id}>
                  <div>
                    <strong>{booking.patient}</strong>
                    <span>{booking.service} · {date(booking.date)} · {booking.duration}</span>
                    {booking.feedback && <em>“{booking.feedback}”</em>}
                  </div>
                  <span className="caregiver-detail-modal__stars">{typeof booking.rating === 'number' ? '★'.repeat(booking.rating) + '☆'.repeat(5 - booking.rating) : 'Not rated'}</span>
                </div>
              )) : <p className="caregiver-detail-modal__hint">No completed bookings yet.</p>}
            </section>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default CaregiverDetailModal;

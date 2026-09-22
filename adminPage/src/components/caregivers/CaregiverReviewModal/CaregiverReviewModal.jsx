import { useState } from 'react';
import Modal from '../../common/Modal/Modal.jsx';
import StatusPill from '../StatusPill/StatusPill.jsx';
import { ACCOUNT_STATUS } from '../../../data/caregiverAccounts.js';
import { documentSlots, fieldLabel, RETURN_REASONS } from '../../../../../shared/caregiverStore.js';
import { Button, Textarea } from '../../../../../shared/ui/index.js';
import './CaregiverReviewModal.css';

const show = (value) => (Array.isArray(value) ? value.join(', ') : value) || '—';
const date = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function Row({ label, value }) {
  return (
    <div className="review-modal__row">
      <span className="review-modal__label">{label}</span>
      <span className="review-modal__value">{show(value)}</span>
    </div>
  );
}

function CaregiverReviewModal({ isOpen, onClose, caregiver, onDecision }) {
  const [note, setNote] = useState('');

  if (!caregiver) return null;

  const { application, pendingChange } = caregiver;
  const needsAccountDecision = caregiver.accountStatus === ACCOUNT_STATUS.pending && Boolean(application);
  const waitingOnApplicant = caregiver.accountStatus === ACCOUNT_STATUS.moreInfo && Boolean(application);
  const showApplication = Boolean(application) && caregiver.accountStatus !== ACCOUNT_STATUS.active;

  const footer = (
    <>
      <Button onClick={onClose}>Close</Button>
      {pendingChange && (
        <>
          <Button variant="danger" disabled={!note.trim()} title={note.trim() ? undefined : 'Give a reason first'} onClick={() => onDecision({ kind: 'change', action: 'reject', note })}>Reject update</Button>
          <Button variant="primary" size="sm" onClick={() => onDecision({ kind: 'change', action: 'approve' })}>Approve update</Button>
        </>
      )}
      {needsAccountDecision && (
        <>
          <Button variant="danger" disabled={!note.trim()} title={note.trim() ? undefined : 'Give a reason first'} onClick={() => onDecision({ kind: 'account', action: 'return', note })}>Not approved</Button>
          <Button variant="primary" size="sm" onClick={() => onDecision({ kind: 'account', action: 'approve' })}>Approve</Button>
        </>
      )}
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Review · ${caregiver.name}`} size="lg" footer={footer}>
      <div className="review-modal">
        {showApplication && (
          <>
            <section className="review-modal__section">
              <div className="review-modal__heading">
                <h3>Application {application.id}</h3>
                <StatusPill status={caregiver.accountStatus} />
              </div>
              <p className="review-modal__meta">
                Submitted {date(application.submittedAt)}
                {application.resubmittedAt && ` · resubmitted ${date(application.resubmittedAt)}`}
              </p>

              {application.resubmittedAt && application.previousNote && (
                <p className="review-modal__note">
                  Sent back earlier with: “{application.previousNote}” The applicant has since edited and resubmitted.
                </p>
              )}
              {waitingOnApplicant && (
                <p className="review-modal__note">
                  Waiting on the applicant. Reason given: “{application.reviewNote}”
                </p>
              )}

              <Row label="Email" value={caregiver.email} />
              <Row label="Phone" value={caregiver.phone} />
              <Row label="Gender" value={caregiver.gender} />
              <Row label="IC / passport" value={caregiver.idNumber} />
              <Row label="Experience" value={caregiver.experienceBand} />
              <Row label="Previous employer" value={caregiver.previousEmployer} />
              <Row label="Specialisations" value={caregiver.specialisations} />
              <Row label="Languages" value={caregiver.languages} />
              <Row label="Center" value={application.data.preferredCenter} />
              <Row label="Coverage areas" value={application.data.coverageAreas} />
              <Row label="Working days" value={caregiver.workingDays} />
              <Row label="Shift preference" value={caregiver.shift} />
              <Row label="Travel mode" value={caregiver.travelMode} />
              <Row label="Earliest start" value={caregiver.startDate} />
            </section>

            <section className="review-modal__section">
              <h3>Documents</h3>
              {documentSlots.map((slot) => {
                const file = application.data.documents[slot.id];
                return (
                  <div className="review-modal__row" key={slot.id}>
                    <span className="review-modal__label">{slot.label}</span>
                    <span className="review-modal__value">
                      {file ? (
                        <Button size="sm" title="Prototype: files are not stored yet">{file.name}</Button>
                      ) : (
                        <span className="review-modal__missing">
                          {slot.required ? 'Missing (required)' : 'Not provided'}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </section>
          </>
        )}

        {pendingChange && (
          <section className="review-modal__section">
            <div className="review-modal__heading">
              <h3>Profile update {pendingChange.id}</h3>
              <StatusPill status="Profile update pending" />
            </div>
            <p className="review-modal__meta">Requested {date(pendingChange.submittedAt)} by the caregiver.</p>

            {Object.entries(pendingChange.changes).map(([field, next]) => (
              <div className="review-modal__row review-modal__row--diff" key={field}>
                <span className="review-modal__label">{fieldLabel(field)}</span>
                <span className="review-modal__value">
                  <s className="review-modal__before">{show(pendingChange.before?.[field])}</s>
                  <strong className="review-modal__after">{show(next)}</strong>
                </span>
              </div>
            ))}
          </section>
        )}

        {(needsAccountDecision || pendingChange) && (
          <section className="review-modal__section">
            <label className="review-modal__field" htmlFor="review-reason">
              Reason, if not approving
            </label>
            {needsAccountDecision && (
              <div className="review-modal__reasons">
                {RETURN_REASONS.map((reason) => (
                  <button
                    type="button"
                    key={reason}
                    className={'review-modal__reason' + (note === reason ? ' review-modal__reason--on' : '')}
                    onClick={() => setNote(reason)}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            )}
            <Textarea
              id="review-reason"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Shown to the caregiver. They can edit their application and resubmit."
            />
          </section>
        )}

      </div>
    </Modal>
  );
}

export default CaregiverReviewModal;

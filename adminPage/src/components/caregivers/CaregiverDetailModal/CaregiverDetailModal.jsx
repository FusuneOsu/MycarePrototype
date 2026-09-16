import Modal from '../../common/Modal/Modal.jsx';
import StatusPill from '../StatusPill/StatusPill.jsx';
import './CaregiverDetailModal.css';

function DetailRow({ label, value }) {
  return (
    <div className="caregiver-detail-modal__row">
      <span className="caregiver-detail-modal__label">{label}</span>
      <span className="caregiver-detail-modal__value">{value || '—'}</span>
    </div>
  );
}

function CaregiverDetailModal({ isOpen, onClose, caregiver }) {
  if (!caregiver) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={caregiver.name} size="md">
      <div className="caregiver-detail-modal">
        <section className="caregiver-detail-modal__section">
          <h3>Caregiver Details</h3>
          <DetailRow label="ID" value={caregiver.id} />
          <DetailRow label="Username" value={caregiver.username} />
          <DetailRow label="Gender" value={caregiver.gender} />
          <DetailRow
            label="Languages"
            value={caregiver.languages?.length ? caregiver.languages.join(', ') : undefined}
          />
          <div className="caregiver-detail-modal__row">
            <span className="caregiver-detail-modal__label">Availability</span>
            <StatusPill status={caregiver.availability} />
          </div>
        </section>

        <section className="caregiver-detail-modal__section">
          <h3>Caregiving Center Details</h3>
          <DetailRow label="Center" value={caregiver.center} />
          <DetailRow label="Travel mode" value={caregiver.travelMode} />
          <DetailRow label="Work accommodations" value={caregiver.workAccommodations} />
        </section>

        <section className="caregiver-detail-modal__section">
          <h3>Assignment Reporting</h3>
          <DetailRow label="Auto-assigned" value={caregiver.autoAssigned} />
          <DetailRow label="Manager name" value={caregiver.managerName} />
          <DetailRow label="Manager ID" value={caregiver.managerId} />
        </section>
      </div>
    </Modal>
  );
}

export default CaregiverDetailModal;

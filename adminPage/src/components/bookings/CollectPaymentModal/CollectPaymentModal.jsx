import { useState } from 'react';
import { Button, Modal } from '../../../../../shared/ui/index.js';
import './CollectPaymentModal.css';

// Popup for "Paid — Collected Directly": admin retrieves the receipt from
// the patient (cash, DuitNow QR, bank transfer, etc.) and uploads it here.
function CollectPaymentModal({ booking, onClose, onSubmit }) {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isOpen = Boolean(booking);

  const handleSubmit = async () => {
    if (!file) {
      setError('Choose a receipt file (image or PDF) first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await onSubmit(booking.id, dataUrl);
      setFile(null);
    } catch (err) {
      setError(err.message || 'Could not upload the receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={booking ? `Mark paid — collected directly · ${booking.id}` : ''}
      footer={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Uploading…' : 'Confirm payment collected'}
          </Button>
        </>
      )}
    >
      <p className="collect-payment-modal__hint">
        Upload the receipt the patient shared for this cash/direct payment (e.g. DuitNow QR screenshot).
        The booking will be marked <strong>Paid — Collected Directly</strong>.
      </p>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(event) => setFile(event.target.files?.[0] || null)}
      />
      {error && <p className="collect-payment-modal__error">{error}</p>}
    </Modal>
  );
}

export default CollectPaymentModal;

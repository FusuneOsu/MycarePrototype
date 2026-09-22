import { Button, Modal } from '../../../../../shared/ui/index.js';
import './BookingDocumentsModal.css';

// Popup shown when an invoice or receipt is clicked from Booking Records.
// Both documents are stored as data: URLs so they can be previewed inline
// and downloaded without any extra storage/backend.
function BookingDocumentsModal({ booking, onClose }) {
  const isOpen = Boolean(booking);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={booking ? `Documents · ${booking.id}` : ''} size="lg">
      {booking && (
        <div className="booking-documents-modal__body">
          {booking.invoice_pdf && (
            <section className="booking-documents-modal__doc">
              <div className="booking-documents-modal__doc-header">
                <h3>Invoice</h3>
                <a href={booking.invoice_pdf} download={`invoice-${booking.id}.pdf`}>
                  <Button size="sm">Download</Button>
                </a>
              </div>
              <iframe className="booking-documents-modal__frame" title="Invoice preview" src={booking.invoice_pdf} />
            </section>
          )}

          {booking.receipt_url && (
            <section className="booking-documents-modal__doc">
              <div className="booking-documents-modal__doc-header">
                <h3>Receipt</h3>
                <a
                  href={booking.receipt_url}
                  download={booking.receipt_url.startsWith('data:') ? `receipt-${booking.id}` : undefined}
                  target={booking.receipt_url.startsWith('data:') ? undefined : '_blank'}
                  rel="noreferrer"
                >
                  <Button size="sm">{booking.receipt_url.startsWith('data:') ? 'Download' : 'Open receipt'}</Button>
                </a>
              </div>
              {booking.receipt_url.startsWith('data:') ? (
                <iframe className="booking-documents-modal__frame" title="Receipt preview" src={booking.receipt_url} />
              ) : (
                <p className="booking-documents-modal__hint">Hosted on Stripe — opens in a new tab.</p>
              )}
            </section>
          )}

          {!booking.invoice_pdf && !booking.receipt_url && (
            <p className="booking-documents-modal__hint">No documents generated for this booking yet.</p>
          )}
        </div>
      )}
    </Modal>
  );
}

export default BookingDocumentsModal;

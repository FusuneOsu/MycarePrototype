import BookingStatusPill from '../BookingStatusPill/BookingStatusPill.jsx';
import { Button } from '../../../../../shared/ui/index.js';
import './BookingTable.css';

function formatDateTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(minutes) {
  if (minutes % 60 === 0) return `${minutes / 60} hr${minutes === 60 ? '' : 's'}`;
  return `${minutes} min`;
}

function formatRate(cents) {
  return `RM ${(cents / 100).toFixed(2)}`;
}

function BookingTable({ bookings, onGeneratePaymentLink, onMarkCollected, onViewDocuments, actionBusyId }) {
  if (bookings.length === 0) {
    return (
      <div className="booking-table__empty">
        <p>No booking records match your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="booking-table-wrap">
      <table className="booking-table">
        <thead>
          <tr>
            <th>Patient</th>
            <th>Caregiver</th>
            <th>Date/Time</th>
            <th>Duration</th>
            <th>Location</th>
            <th>Service type</th>
            <th>Status</th>
            <th>Price/Rate</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td>{booking.patient_name}</td>
              <td>{booking.caregiver_name}</td>
              <td>{formatDateTime(booking.scheduled_at)}</td>
              <td>{formatDuration(booking.duration_mins)}</td>
              <td>{booking.location}</td>
              <td>{booking.service_type}</td>
              <td><BookingStatusPill status={booking.status} /></td>
              <td>{formatRate(booking.rate_cents)}</td>
              <td className="booking-table__actions">
                {booking.status === 'Service completed' && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={actionBusyId === booking.id}
                    onClick={() => onGeneratePaymentLink(booking)}
                  >
                    {actionBusyId === booking.id ? 'Generating…' : 'Generate payment link'}
                  </Button>
                )}
                {booking.status === 'Link sent (Unpaid)' && (
                  <>
                    {booking.stripe_checkout_url && (
                      <Button size="sm" href={booking.stripe_checkout_url} target="_blank" rel="noreferrer">
                        Open link
                      </Button>
                    )}
                    <Button size="sm" onClick={() => onMarkCollected(booking)}>Mark paid — collected</Button>
                  </>
                )}
                {(booking.invoice_pdf || booking.receipt_url) && (
                  <Button size="sm" onClick={() => onViewDocuments(booking)}>View documents</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BookingTable;

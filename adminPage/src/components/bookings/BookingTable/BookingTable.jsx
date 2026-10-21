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

/**
 * Try to parse a cost_breakdown from a booking.
 */
function getCostTotal(booking) {
  const raw = booking.cost_breakdown || booking.costBreakdown;
  if (!raw) return null;
  if (typeof raw === 'object') return raw.total || null;
  try { return JSON.parse(raw).total || null; } catch { return null; }
}

function BookingTable({ bookings, onGeneratePaymentLink, onMarkCollected, onViewDocuments, onViewCosts, actionBusyId }) {
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
            <th>Price</th>
            <th>Costs</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const costTotal = getCostTotal(booking);
            return (
            <tr key={booking.id}>
              <td>{booking.patient_name}</td>
              <td>{booking.caregiver_name}</td>
              <td>{formatDateTime(`${booking.date}T${booking.start_time}`)}</td>
              <td>{formatDuration(booking.duration_mins)}</td>
              <td>{booking.location}</td>
              <td>{booking.service_type}</td>
              <td><BookingStatusPill status={booking.status} /></td>
              <td>{formatRate(booking.rate_cents)}</td>
              <td>
                {costTotal != null ? (
                  <span className="booking-table__cost-total">RM {costTotal.toFixed(2)}</span>
                ) : (
                  <span className="booking-table__cost-na">—</span>
                )}
                <button
                  className="booking-table__cost-btn"
                  onClick={() => onViewCosts(booking)}
                  title="View cost breakdown"
                >
                  Details
                </button>
              </td>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default BookingTable;

import BookingStatusPill from '../BookingStatusPill/BookingStatusPill.jsx';
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

function BookingTable({ bookings }) {
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BookingTable;

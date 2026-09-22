import './BookingFilters.css';

export const BOOKING_STATUS_OPTIONS = [
  'Caregiver assigned',
  'In progress',
  'Service completed',
  'Missed',
  'Cancelled',
  'Link sent (Unpaid)',
  'Paid - Online',
  'Paid - Collected Directly',
];

function BookingFilters({ search, onSearchChange, status, onStatusChange, resultCount }) {
  return (
    <div className="booking-filters">
      <input
        type="text"
        className="booking-filters__search"
        placeholder="Search by patient, caregiver, location..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        aria-label="Search bookings"
      />

      <select
        className="booking-filters__select"
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        aria-label="Filter by status"
      >
        <option value="All">All statuses</option>
        {BOOKING_STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>

      <span className="booking-filters__count">{resultCount} booking(s)</span>
    </div>
  );
}

export default BookingFilters;

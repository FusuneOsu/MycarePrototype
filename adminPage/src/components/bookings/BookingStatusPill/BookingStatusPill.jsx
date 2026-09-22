import './BookingStatusPill.css';

const STATUS_CLASS = {
  'Caregiver assigned': 'booking-status-pill--assigned',
  'In progress': 'booking-status-pill--in-progress',
  'Service completed': 'booking-status-pill--completed',
  Missed: 'booking-status-pill--missed',
  Cancelled: 'booking-status-pill--cancelled',
  'Link sent (Unpaid)': 'booking-status-pill--unpaid',
  'Paid - Online': 'booking-status-pill--paid',
  'Paid - Collected Directly': 'booking-status-pill--paid',
};

function BookingStatusPill({ status }) {
  const modifier = STATUS_CLASS[status] ?? 'booking-status-pill--neutral';
  return <span className={`booking-status-pill ${modifier}`}>{status}</span>;
}

export default BookingStatusPill;

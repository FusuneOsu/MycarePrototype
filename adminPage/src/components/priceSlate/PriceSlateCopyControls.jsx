import { useState } from 'react';
import './PriceSlateCopyControls.css';

export default function PriceSlateCopyControls({ bookings, currentBookingId, onCopy, disabled = false }) {
  const options = bookings.filter((booking) => booking.id !== currentBookingId);
  const [bookingId, setBookingId] = useState('');
  const selected = options.find((booking) => booking.id === bookingId);

  return (
    <div className="price-slate-copy">
      <label>
        <span>Copy rows from another booking with a saved slate</span>
        <select value={bookingId} onChange={(event) => setBookingId(event.target.value)} disabled={disabled}>
          <option value="">Choose a booking…</option>
          {options.map((booking) => (
            <option key={booking.id} value={booking.id}>
              {booking.patient_name} · {booking.date} · {booking.id}
            </option>
          ))}
        </select>
      </label>
      <button type="button" disabled={disabled || !selected} onClick={() => selected && onCopy(selected)}>
        Copy slate
      </button>
    </div>
  );
}

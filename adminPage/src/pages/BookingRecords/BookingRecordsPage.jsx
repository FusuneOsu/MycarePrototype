import { useEffect, useMemo, useState } from 'react';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import BookingFilters from '../../components/bookings/BookingFilters/BookingFilters.jsx';
import BookingTable from '../../components/bookings/BookingTable/BookingTable.jsx';
import './BookingRecordsPage.css';

function BookingRecordsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/bookings')
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setBookings(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const matchesStatus = status === 'All' || booking.status === status;
      const matchesSearch =
        !query ||
        [booking.patient_name, booking.caregiver_name, booking.location]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [bookings, search, status]);

  return (
    <div className="booking-records-page">
      <Topbar
        title="Booking Records"
        subtitle="Track requests once they've been assigned to a caregiver, from booking through to payment."
      />

      <div className="booking-records-page__body">
        <BookingFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          resultCount={filteredBookings.length}
        />

        {loading && <p className="booking-records-page__loading">Loading booking records…</p>}

        {!loading && error && (
          <p className="booking-records-page__error">
            Couldn't load booking records from the API yet. Deploy with the D1 binding to see live data.
          </p>
        )}

        {!loading && !error && <BookingTable bookings={filteredBookings} />}
      </div>
    </div>
  );
}

export default BookingRecordsPage;

import { useEffect, useMemo, useState } from 'react';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import BookingFilters from '../../components/bookings/BookingFilters/BookingFilters.jsx';
import BookingTable from '../../components/bookings/BookingTable/BookingTable.jsx';
import BookingDocumentsModal from '../../components/bookings/BookingDocumentsModal/BookingDocumentsModal.jsx';
import CollectPaymentModal from '../../components/bookings/CollectPaymentModal/CollectPaymentModal.jsx';
import { buildInvoicePdf } from '../../utils/invoice.js';
import './BookingRecordsPage.css';

function BookingRecordsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [actionBusyId, setActionBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [documentsBooking, setDocumentsBooking] = useState(null);
  const [collectBooking, setCollectBooking] = useState(null);

  const loadBookings = () => {
    setLoading(true);
    fetch('/api/bookings')
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with ${response.status}`);
        return response.json();
      })
      .then((data) => setBookings(data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  };

  useEffect(loadBookings, []);

  const generatePaymentLink = async (booking) => {
    setActionError('');
    setActionBusyId(booking.id);
    try {
      const invoicePdf = buildInvoicePdf(booking);
      const response = await fetch(`/api/bookings/${encodeURIComponent(booking.id)}/pay-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoicePdf }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not generate the payment link.');
      if (result.demo) setActionError('Demo mode: add STRIPE_SECRET_KEY to create a real Stripe test link.');
      // open payments in a new tab - need to create a whole browser based session first because
      // currently this app only does tab-based session
      // else if (result.checkoutUrl) window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');

      // current fix - open Stripe payment in current tab where login is established
      else if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      loadBookings();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionBusyId(null);
    }
  };

  const markCollected = async (bookingId, receiptDataUrl) => {
    const response = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptDataUrl }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Could not mark the booking as paid.');
    setCollectBooking(null);
    loadBookings();
  };

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

        {actionError && <p className="booking-records-page__error">{actionError}</p>}

        {!loading && !error && (
          <BookingTable
            bookings={filteredBookings}
            actionBusyId={actionBusyId}
            onGeneratePaymentLink={generatePaymentLink}
            onMarkCollected={setCollectBooking}
            onViewDocuments={setDocumentsBooking}
          />
        )}
      </div>

      <BookingDocumentsModal booking={documentsBooking} onClose={() => setDocumentsBooking(null)} />
      <CollectPaymentModal booking={collectBooking} onClose={() => setCollectBooking(null)} onSubmit={markCollected} />
    </div>
  );
}

export default BookingRecordsPage;

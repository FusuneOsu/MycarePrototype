import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import RequestCard from '../../components/requests/RequestCard.jsx';
import CaregiverFinder from '../../components/requests/CaregiverFinder.jsx';
import BookingCard from '../../components/requests/BookingCard.jsx';
import PaymentCard from '../../components/requests/PaymentCard.jsx';
import {
  BOOKING_STATUS, REQUEST_STATUS, getRequest, getBooking, listBookings, refreshCache
} from '../../../../shared/bookingStore.js';
import { Button, Card, SectionHeader } from '../../../../shared/ui/index.js';
import './PatientRequestPage.css';

function PatientRequestPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  // Bumped to re-read the store after any change here or in the caregiver app.
  const [, setVersion] = useState(0);
  const [flash, setFlash] = useState('');
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  // The caregiver app writes to the same store (e.g. marking a visit complete).
  useEffect(() => {
    refreshCache();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); };
  }, [refresh]);

  // Cheap localStorage reads, done on every render so they are never stale.
  const request = getRequest(requestId);
  const booking = request?.bookingId ? getBooking(request.bookingId) : null;
  const cancelled = request
    ? listBookings().filter((item) => item.requestId === request.id && item.status === BOOKING_STATUS.cancelled)
    : [];

  const back = <Button onClick={() => navigate('/requests')}>{'\u2190'} Back to requests</Button>;

  if (!request) {
    return (
      <div className="patient-request-page">
        <Topbar title="Patient request" subtitle="Review the intake before assigning care." actions={back} />
        <Card padded>
          <SectionHeader
            eyebrow={requestId}
            title="Request not found"
            intro="This conversation hasn't been turned into a request yet, or the link is out of date."
          />
        </Card>
      </div>
    );
  }

  const bookable = request.status === REQUEST_STATUS.new || request.status === REQUEST_STATUS.review;

  return (
    <div className="patient-request-page">
      <Topbar
        title="Patient request"
        subtitle="Review the intake, find an available caregiver, and confirm the booking."
        actions={back}
      />
      {flash && <div className="ui-banner request-flash" role="status">{flash}</div>}

      <section className="patient-request-page__grid">
        <RequestCard key={`${request.id}-${request.status}`} request={request} onChanged={refresh} />
        <div className="patient-request-page__side">
          {booking ? (
            <>
              <BookingCard key={`${booking.id}-${booking.updatedAt}`} booking={booking} onChanged={refresh} />
              <PaymentCard booking={booking} onChanged={refresh} />
            </>
          ) : (
            <Card padded variant="tint">
              <SectionHeader
                eyebrow="Booking"
                title="Not booked yet"
                intro={bookable ? 'Use the caregiver finder below to confirm a booking.' : 'Reopen the request to book it.'}
              />
              {cancelled.length > 0 && (
                <p className="finder-hint">
                  Previously cancelled: {cancelled.map((item) => `${item.id} (${item.history.at(-1)?.reason})`).join('; ')}
                </p>
              )}
            </Card>
          )}
        </div>
      </section>

      {bookable && !booking && (
        <CaregiverFinder
          key={request.id}
          request={request}
          onBooked={(created) => {
            setFlash(
              `Booking ${created.id} confirmed with ${created.caregiverName}. ` +
              `WhatsApp confirmation sent to ${created.patientName}; ${created.caregiverName} has been notified.`
            );
            refresh();
          }}
        />
      )}
    </div>
  );
}

export default PatientRequestPage;

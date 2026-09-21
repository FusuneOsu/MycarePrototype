import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getEffectiveRequest, writeRequestOverrides } from '../../data/mockRequests.js';
import { upsertAppointmentFromRequest } from '../../data/mockAppointments.js';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import AssignCaregiverModal from '../../components/caregivers/AssignCaregiverModal/AssignCaregiverModal.jsx';
import './PatientRequestPage.css';

function PatientRequestPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [storedRequest, setStoredRequest] = useState(() => getEffectiveRequest(requestId));
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');

  useEffect(() => {
    setStoredRequest(getEffectiveRequest(requestId));
  }, [requestId]);

  useEffect(() => {
    const syncRequest = (event) => {
      if (event.key !== `mycare.patientRequest.${requestId}` || !event.newValue) return;
      setStoredRequest(getEffectiveRequest(requestId));
    };
    window.addEventListener('storage', syncRequest);
    return () => window.removeEventListener('storage', syncRequest);
  }, [requestId]);

  if (!storedRequest) {
    return (
      <div className="patient-request-page">
        <Topbar title="Patient request" subtitle="This request could not be found." />
        <div className="patient-request-page__body">
          <button type="button" className="patient-request-page__back" onClick={() => navigate('/requests')}>
            ← Back to requests
          </button>
        </div>
      </div>
    );
  }

  const { assignmentStatus, receiptStatus, payoutStatus } = storedRequest;

  const handleAssignCaregiver = (caregiver) => {
    const next = writeRequestOverrides(requestId, {
      caregiverId: caregiver.id,
      caregiverName: caregiver.name,
      assignmentStatus: 'Caregiver assigned',
      status: 'Booked',
    });
    upsertAppointmentFromRequest(storedRequest, caregiver);
    setStoredRequest({ ...storedRequest, ...next });
  };

  const createPaymentLink = async () => {
    setPaymentMessage('Creating secure payment link...');
    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: storedRequest.id,
          patientId: storedRequest.patientId,
          amountCents: 12000,
          currency: 'myr',
          description: `${storedRequest.careType} for ${storedRequest.patientName}`,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Payment link could not be created.');
      if (result.demo) {
        setPaymentMessage('Demo mode: add STRIPE_SECRET_KEY to create a real Stripe test link.');
        return;
      }
      setPaymentMessage('Payment link created.');
      window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setPaymentMessage(error.message);
    }
  };

  const markReceiptVerified = () => {
    const next = writeRequestOverrides(requestId, { receiptStatus: 'Receipt verified' });
    setStoredRequest({ ...storedRequest, ...next });
  };

  const releaseCaregiverPayment = () => {
    const next = writeRequestOverrides(requestId, { payoutStatus: 'Paid to caregiver' });
    setStoredRequest({ ...storedRequest, ...next });
  };

  return (
    <div className="patient-request-page">
      <Topbar title="Patient request" subtitle="Review the intake before assigning care." />
      <div className="patient-request-page__body">
        <div className="patient-request-page__back-row">
          <button type="button" className="patient-request-page__back" onClick={() => navigate('/requests')}>
            ← Back to requests
          </button>
          <span className="patient-request-page__request-id">{storedRequest.source} request · {storedRequest.id}</span>
        </div>

        <section className="patient-request-page__grid">
          <article className="patient-request-card patient-request-card--wide">
            <div className="patient-request-card__heading">
              <div><p className="patient-request-card__eyebrow">New patient request</p><h2>{storedRequest.patientName}</h2></div>
              <StatusPill status={assignmentStatus} />
            </div>
            <div className="patient-request-details">
              <div><span>Patient ID</span><strong>{storedRequest.patientId}</strong></div>
              <div><span>Contact number</span><strong>{storedRequest.phone}</strong></div>
              <div><span>Preferred language</span><strong>{storedRequest.language}</strong></div>
              <div><span>Care requested</span><strong>{storedRequest.careType}</strong></div>
              <div><span>Requested date</span><strong>{storedRequest.requestedDate}</strong></div>
              <div><span>Preferred time</span><strong>{storedRequest.preferredTime}</strong></div>
              <div><span>Caregiver gender preference</span><strong>{storedRequest.genderPreference}</strong></div>
              <div><span>Skill needed</span><strong>{storedRequest.requiredSkill || 'None specified'}</strong></div>
              <div className="patient-request-details__full"><span>Location</span><strong>{storedRequest.location} · {storedRequest.zone} zone</strong></div>
            </div>
            {storedRequest.notes && <div className="patient-request-note"><span>Patient notes</span><p>{storedRequest.notes}</p></div>}
          </article>

          <article className="patient-request-card">
            <div className="patient-request-card__heading"><div><p className="patient-request-card__eyebrow">Assignment</p><h2>Caregiver</h2></div></div>
            {storedRequest.caregiverId ? (
              <div className="patient-request-payment-row"><span>Assigned caregiver</span><strong>{storedRequest.caregiverName}</strong></div>
            ) : (
              <p className="patient-request-helper">No caregiver assigned yet.</p>
            )}
            <button type="button" className="patient-request-primary" onClick={() => setIsAssignModalOpen(true)}>
              {storedRequest.caregiverId ? 'Reassign caregiver' : 'Assign caregiver'}
            </button>
            <p className="patient-request-helper">The patient will receive a WhatsApp confirmation after assignment.</p>
          </article>

          <article className="patient-request-card">
            <div className="patient-request-card__heading"><div><p className="patient-request-card__eyebrow">Payment</p><h2>Service payment</h2></div></div>
            <div className="patient-request-amount"><span>Patient service amount</span><strong>{storedRequest.serviceAmount}</strong></div>
            <div className="patient-request-payment-row"><span>Receipt from WhatsApp</span><StatusPill status={receiptStatus} /></div>
            <div className="patient-request-payment-row"><span>Caregiver payout</span><strong>{storedRequest.caregiverPayment}</strong></div>
            <button type="button" className="patient-request-secondary" onClick={createPaymentLink}>Create patient payment link</button>
            {paymentMessage && <p className="patient-request-helper">{paymentMessage}</p>}
            <button type="button" className="patient-request-secondary" onClick={markReceiptVerified}>Mark receipt verified</button>
            <button type="button" className="patient-request-primary" disabled={receiptStatus !== 'Receipt verified' || assignmentStatus !== 'Caregiver assigned'} onClick={releaseCaregiverPayment}>{payoutStatus === 'Paid to caregiver' ? 'Caregiver paid' : 'Release caregiver payment'}</button>
          </article>
        </section>
      </div>

      <AssignCaregiverModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        request={storedRequest}
        onAssign={handleAssignCaregiver}
      />
    </div>
  );
}

export default PatientRequestPage;

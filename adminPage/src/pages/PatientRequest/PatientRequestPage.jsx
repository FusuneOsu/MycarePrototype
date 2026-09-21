import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBookableCaregivers, listCaregiverAccounts } from '../../data/caregiverAccounts.js';
import { canonicalCaregiverId, formatRating } from '../../../../shared/bookingHistory.js';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import { Button, Card, Field, SectionHeader, Select } from '../../../../shared/ui/index.js';
import './PatientRequestPage.css';

const request = {
  id: 'WA-REQ-1001',
  patientId: 'PT-1011',
  patientName: 'Nur Aisyah Rahman',
  phone: '+60 12-345 6789',
  language: 'Malay',
  careType: 'Post-operative home care',
  requestedDate: '28 September 2026',
  preferredTime: '10:00 - 12:00',
  location: '24 Jalan Damai, Kuala Lumpur',
  notes: 'Needs help with mobility, medication reminders, and wound-care observation after knee surgery.',
  serviceAmount: 'RM 120.00',
  caregiverPayment: 'RM 90.00',
};

const REQUEST_STORAGE_KEY = 'mycare.patientRequest.WA-REQ-1001';

function readRequest() {
  try {
    const stored = { ...request, ...JSON.parse(window.localStorage.getItem(REQUEST_STORAGE_KEY) || '{}') };
    // Older saves used a placeholder id for the demo caregiver (now CG-1013).
    return stored.caregiverId ? { ...stored, caregiverId: canonicalCaregiverId(stored.caregiverId) } : stored;
  } catch {
    return request;
  }
}

function PatientRequestPage() {
  const navigate = useNavigate();
  const [storedRequest, setStoredRequest] = useState(readRequest);
  const [selectedCaregiver, setSelectedCaregiver] = useState(storedRequest.caregiverId || '');
  const [assignmentStatus, setAssignmentStatus] = useState(storedRequest.assignmentStatus || 'Pending assignment');
  const [receiptStatus, setReceiptStatus] = useState(storedRequest.receiptStatus || 'Receipt pending');
  const [payoutStatus, setPayoutStatus] = useState(storedRequest.payoutStatus || 'Awaiting payment');
  const [paymentMessage, setPaymentMessage] = useState('');

  useEffect(() => {
    const syncRequest = (event) => {
      if (event.key !== REQUEST_STORAGE_KEY || !event.newValue) return;
      const next = { ...request, ...JSON.parse(event.newValue) };
      setStoredRequest(next);
      setSelectedCaregiver(next.caregiverId || '');
      setAssignmentStatus(next.assignmentStatus || 'Pending assignment');
      setReceiptStatus(next.receiptStatus || 'Receipt pending');
      setPayoutStatus(next.payoutStatus || 'Awaiting payment');
    };
    window.addEventListener('storage', syncRequest);
    return () => window.removeEventListener('storage', syncRequest);
  }, []);

  // The booking pool: Active caregivers only — approved applicants included,
  // suspended/deactivated ones excluded — minus anyone on leave today.
  const bookable = listBookableCaregivers().filter((caregiver) => caregiver.availability !== 'On Leave');
  const assigned = storedRequest.caregiverId ? listCaregiverAccounts().find((item) => item.id === storedRequest.caregiverId) : null;
  const assignedNotBookable = assigned && !bookable.some((item) => item.id === assigned.id);

  const assignCaregiver = () => {
    if (!selectedCaregiver) return;
    const caregiver = listCaregiverAccounts().find((item) => item.id === selectedCaregiver);
    const next = { ...storedRequest, caregiverId: selectedCaregiver, caregiverName: caregiver?.name, assignmentStatus: 'Caregiver assigned' };
    window.localStorage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(next));
    setStoredRequest(next);
    setAssignmentStatus(next.assignmentStatus);
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

  const verifyReceipt = () => {
    const next = { ...storedRequest, receiptStatus: 'Receipt verified' };
    window.localStorage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(next));
    setStoredRequest(next);
    setReceiptStatus(next.receiptStatus);
  };

  const releasePayment = () => {
    const next = { ...storedRequest, payoutStatus: 'Paid to caregiver' };
    window.localStorage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(next));
    setStoredRequest(next);
    setPayoutStatus(next.payoutStatus);
  };

  return (
    <div className="patient-request-page">
      <Topbar
        title="Patient request"
        subtitle="Review the WhatsApp intake before assigning care."
        actions={<Button onClick={() => navigate('/requests')}>← Back to requests</Button>}
      />

      <section className="patient-request-page__grid">
        <Card padded className="patient-request-card--wide">
          <SectionHeader eyebrow={`WhatsApp request · ${request.id}`} title={request.patientName} actions={<StatusPill status={assignmentStatus} />} />
          <div className="patient-request-details">
            <div><span>Patient ID</span><strong>{storedRequest.patientId}</strong></div>
            <div><span>WhatsApp number</span><strong>{storedRequest.phone}</strong></div>
            <div><span>Preferred language</span><strong>{storedRequest.language}</strong></div>
            <div><span>Care requested</span><strong>{storedRequest.careType}</strong></div>
            <div><span>Requested date</span><strong>{storedRequest.requestedDate}</strong></div>
            <div><span>Preferred time</span><strong>{storedRequest.preferredTime}</strong></div>
            <div className="patient-request-details__full"><span>Location</span><strong>{storedRequest.location}</strong></div>
          </div>
          <div className="patient-request-note"><span>Patient notes</span><p>{storedRequest.notes}</p></div>
        </Card>

        <Card padded>
          <SectionHeader eyebrow="Assignment" title="Choose caregiver" />
          <Field label="Available caregiver">
            <Select value={selectedCaregiver} onChange={(event) => setSelectedCaregiver(event.target.value)}>
              <option value="">Select a caregiver</option>
              {assignedNotBookable && <option value={assigned.id} disabled>{assigned.name} · {assigned.accountStatus} (no longer bookable)</option>}
              {bookable.map((caregiver) => <option key={caregiver.id} value={caregiver.id}>{caregiver.name} · {caregiver.center} · {formatRating(caregiver.bookingSummary)}{caregiver.source === 'application' ? ' · new' : ''}</option>)}
            </Select>
          </Field>
          <Button variant="primary" block className="patient-request-action" disabled={!selectedCaregiver} onClick={assignCaregiver}>Assign caregiver</Button>
          <p className="patient-request-helper">The patient will receive a WhatsApp confirmation after assignment.</p>
        </Card>

        <Card padded>
          <SectionHeader eyebrow="Payment" title="Service payment" />
          <div className="patient-request-amount"><span>Patient service amount</span><strong>{storedRequest.serviceAmount}</strong></div>
          <div className="patient-request-payment-row"><span>Receipt from WhatsApp</span><StatusPill status={receiptStatus} /></div>
          <div className="patient-request-payment-row"><span>Caregiver payout</span><strong>{storedRequest.caregiverPayment}</strong></div>
          <div className="patient-request-actions">
            <Button block onClick={createPaymentLink}>Create patient payment link</Button>
            {paymentMessage && <p className="patient-request-helper">{paymentMessage}</p>}
            <Button block onClick={verifyReceipt}>Mark receipt verified</Button>
            <Button variant="primary" block disabled={receiptStatus !== 'Receipt verified' || assignmentStatus !== 'Caregiver assigned'} onClick={releasePayment}>
              {payoutStatus === 'Paid to caregiver' ? 'Caregiver paid' : 'Release caregiver payment'}
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}

export default PatientRequestPage;
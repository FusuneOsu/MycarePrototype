import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockCaregivers } from '../../data/mockCaregivers.js';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
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
const DEMO_CAREGIVER = { id: 'CG-DEMO', name: 'Sarah Tan', center: 'Kuala Lumpur' };

function readRequest() {
  try {
    return { ...request, ...JSON.parse(window.localStorage.getItem(REQUEST_STORAGE_KEY) || '{}') };
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

  const assignCaregiver = () => {
    if (!selectedCaregiver) return;
    const caregiver = selectedCaregiver === DEMO_CAREGIVER.id ? DEMO_CAREGIVER : mockCaregivers.find((item) => item.id === selectedCaregiver);
    const next = { ...storedRequest, caregiverId: selectedCaregiver, caregiverName: caregiver?.name, assignmentStatus: 'Caregiver assigned' };
    window.localStorage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(next));
    setStoredRequest(next);
    setAssignmentStatus(next.assignmentStatus);
  };

  return (
    <div className="patient-request-page">
      <Topbar title="Patient request" subtitle="Review the WhatsApp intake before assigning care." />
      <div className="patient-request-page__body">
        <div className="patient-request-page__back-row">
          <button type="button" className="patient-request-page__back" onClick={() => navigate('/appointments')}>
            ← Back to appointments
          </button>
          <span className="patient-request-page__request-id">WhatsApp request · {request.id}</span>
        </div>

        <section className="patient-request-page__grid">
          <article className="patient-request-card patient-request-card--wide">
            <div className="patient-request-card__heading">
              <div><p className="patient-request-card__eyebrow">New patient request</p><h2>{request.patientName}</h2></div>
              <StatusPill status={assignmentStatus} />
            </div>
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
          </article>

          <article className="patient-request-card">
            <div className="patient-request-card__heading"><div><p className="patient-request-card__eyebrow">Assignment</p><h2>Choose caregiver</h2></div></div>
            <label className="patient-request-field">Available caregiver
              <select value={selectedCaregiver} onChange={(event) => setSelectedCaregiver(event.target.value)}>
                <option value="">Select a caregiver</option>
                <option value={DEMO_CAREGIVER.id}>{DEMO_CAREGIVER.name} · Demo caregiver</option>
                {mockCaregivers.filter((caregiver) => caregiver.availability !== 'On Leave').map((caregiver) => <option key={caregiver.id} value={caregiver.id}>{caregiver.name} · {caregiver.center}</option>)}
              </select>
            </label>
            <button type="button" className="patient-request-primary" disabled={!selectedCaregiver} onClick={assignCaregiver}>Assign caregiver</button>
            <p className="patient-request-helper">The patient will receive a WhatsApp confirmation after assignment.</p>
          </article>

          <article className="patient-request-card">
            <div className="patient-request-card__heading"><div><p className="patient-request-card__eyebrow">Payment</p><h2>Service payment</h2></div></div>
            <div className="patient-request-amount"><span>Patient service amount</span><strong>{storedRequest.serviceAmount}</strong></div>
            <div className="patient-request-payment-row"><span>Receipt from WhatsApp</span><StatusPill status={receiptStatus} /></div>
            <div className="patient-request-payment-row"><span>Caregiver payout</span><strong>{storedRequest.caregiverPayment}</strong></div>
            <button type="button" className="patient-request-secondary" onClick={() => { const next = { ...storedRequest, receiptStatus: 'Receipt verified' }; window.localStorage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(next)); setStoredRequest(next); setReceiptStatus(next.receiptStatus); }}>Mark receipt verified</button>
            <button type="button" className="patient-request-primary" disabled={receiptStatus !== 'Receipt verified' || assignmentStatus !== 'Caregiver assigned'} onClick={() => { const next = { ...storedRequest, payoutStatus: 'Paid to caregiver' }; window.localStorage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(next)); setStoredRequest(next); setPayoutStatus(next.payoutStatus); }}>{payoutStatus === 'Paid to caregiver' ? 'Caregiver paid' : 'Release caregiver payment'}</button>
          </article>
        </section>
      </div>
    </div>
  );
}

export default PatientRequestPage;
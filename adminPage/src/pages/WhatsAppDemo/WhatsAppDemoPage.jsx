import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import './WhatsAppDemoPage.css';
import './WhatsAppDemoInbox.css';

const conversations = [
  { id: 'WA-REQ-1001', initials: 'NA', name: 'Nur Aisyah Rahman', preview: 'I need help after my knee surgery.', time: '10:16 AM', unread: true, messages: [
    { side: 'patient', text: 'Hi, I need a caregiver after my knee surgery.', time: '10:14 AM' },
    { side: 'system', text: 'Fill in this information for caregiver request:\n\n1. Full name\n2. Phone number\n3. Home location\n4. Type of care needed\n5. Preferred date and time\n6. Additional notes', time: '10:14 AM' },
    { side: 'patient', text: 'Nur Aisyah Rahman\n+60 12-345 6789\n24 Jalan Damai, Kuala Lumpur\nPost-operative home care\n28 September, 10:00 AM\nHelp with mobility and medication reminders.', time: '10:16 AM' },
    { side: 'system', text: 'Thank you. Your request has been sent to the care team for review.', time: '10:16 AM' },
  ] },
  { id: 'WA-REQ-1002', initials: 'DL', name: 'Daniel Lim', preview: 'Can I request a caregiver tomorrow?', time: 'Yesterday', unread: false, messages: [
    { side: 'patient', text: 'Can I request a caregiver tomorrow?', time: 'Yesterday' },
    { side: 'system', text: 'Please complete the caregiver request information form so our team can help you.', time: 'Yesterday' },
  ] },
  { id: 'WA-REQ-0998', initials: 'NI', name: 'Nadia Ismail', preview: 'Thank you, I received the details.', time: 'Mon', unread: false, messages: [
    { side: 'system', text: 'Your caregiver assignment has been confirmed. Your caregiver will contact you shortly.', time: 'Mon' },
    { side: 'patient', text: 'Thank you, I received the details.', time: 'Mon' },
  ] },
];

export default function WhatsAppDemoPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(conversations[0].id);
  const [requestCreated, setRequestCreated] = useState(false);
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId) || conversations[0];

  return <div className="whatsapp-demo-page">
    <Topbar title="WhatsApp requests" subtitle="Review patient conversations and convert completed intake into appointments." />
    <div className="whatsapp-demo-page__body">
      <div className="whatsapp-demo-page__intro"><div><p className="whatsapp-demo-page__eyebrow">Mock integration</p><h2>Patient intake inbox</h2><p>Each completed conversation becomes a patient request that can be reviewed, scheduled, and assigned from the same admin workflow.</p></div><StatusPill status={requestCreated ? 'Request created' : '3 conversations'} /></div>
      <div className="whatsapp-demo-page__grid">
        <aside className="whatsapp-inbox-list">{conversations.map((conversation) => <button type="button" className={`whatsapp-conversation ${selectedId === conversation.id ? 'whatsapp-conversation--selected' : ''}`} key={conversation.id} onClick={() => { setSelectedId(conversation.id); setRequestCreated(false); }}><span className="whatsapp-conversation__avatar">{conversation.initials}</span><span className="whatsapp-conversation__copy"><strong>{conversation.name}</strong><small>{conversation.preview}</small></span><span className="whatsapp-conversation__meta">{conversation.unread && <i />}{conversation.time}</span></button>)}</aside>
        <section className="whatsapp-phone"><div className="whatsapp-phone__header"><span className="whatsapp-phone__avatar">{selectedConversation.initials}</span><div><strong>{selectedConversation.name}</strong><small>WhatsApp conversation · request {selectedConversation.id}</small></div><span className="whatsapp-phone__more">•••</span></div><div className="whatsapp-phone__messages">{selectedConversation.messages.map((message, index) => <div className={`whatsapp-message whatsapp-message--${message.side}`} key={index}><span>{message.text}</span><small>{message.time} ✓✓</small></div>)}</div><div className="whatsapp-phone__input"><span>Demo conversation is read-only</span><button type="button">➤</button></div></section>
        <section className="whatsapp-demo-card"><p className="whatsapp-demo-page__eyebrow">Request action</p><h3>{selectedConversation.id === 'WA-REQ-1001' ? 'Ready for admin review' : 'Conversation overview'}</h3><div className="whatsapp-data-row"><span>Patient</span><strong>{selectedConversation.name}</strong></div><div className="whatsapp-data-row"><span>Request ID</span><strong>{selectedConversation.id}</strong></div><div className="whatsapp-data-row"><span>Next step</span><strong>{selectedConversation.id === 'WA-REQ-1001' ? 'Review and assign caregiver' : 'Continue conversation'}</strong></div><button type="button" className="whatsapp-primary" disabled={selectedConversation.id !== 'WA-REQ-1001'} onClick={() => { setRequestCreated(true); navigate('/requests/WA-REQ-1001'); }}>{requestCreated ? 'Open patient request' : 'Open patient request'}</button><p className="whatsapp-helper">Demo only. No WhatsApp message is sent and no external service is contacted.</p></section>
      </div>
    </div>
  </div>;
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './WhatsAppRequestPopup.css';

const conversations = [
  { id: 'WA-REQ-1001', initials: 'NA', name: 'Nur Aisyah Rahman', preview: 'I need help after my knee surgery.', time: '10:16 AM', unread: true, messages: [
    ['patient', 'Hi, I need a caregiver after my knee surgery.', '10:14 AM'],
    ['system', 'Fill in this information for caregiver request:\n\n1. Full name\n2. Phone number\n3. Home location\n4. Type of care needed\n5. Preferred date and time\n6. Additional notes', '10:14 AM'],
    ['patient', 'Nur Aisyah Rahman\n+60 12-345 6789\n24 Jalan Damai, Kuala Lumpur\nPost-operative home care\n28 September, 10:00 AM', '10:16 AM'],
  ] },
  { id: 'WA-REQ-1002', initials: 'DL', name: 'Daniel Lim', preview: 'Can I request a caregiver tomorrow?', time: 'Yesterday', unread: false, messages: [['patient', 'Can I request a caregiver tomorrow?', 'Yesterday'], ['system', 'Please complete the caregiver request information form so our team can help you.', 'Yesterday']] },
  { id: 'WA-REQ-0998', initials: 'NI', name: 'Nadia Ismail', preview: 'Thank you, I received the details.', time: 'Mon', unread: false, messages: [['system', 'Your caregiver assignment has been confirmed.', 'Mon'], ['patient', 'Thank you, I received the details.', 'Mon']] },
];

export default function WhatsAppRequestPopup() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(conversations[0].id);
  const selected = conversations.find((item) => item.id === selectedId) || conversations[0];

  return <>
    <button type="button" className="whatsapp-fab" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
      <span className="whatsapp-fab__icon">◉</span><span>WhatsApp requests</span><b>1</b>
    </button>
    {isOpen && <section className="whatsapp-popup" aria-label="WhatsApp request conversations">
      <header className="whatsapp-popup__header"><div><strong>WhatsApp requests</strong><small>Patient intake inbox</small></div><button type="button" onClick={() => setIsOpen(false)} aria-label="Close WhatsApp requests">×</button></header>
      <div className="whatsapp-popup__body">
        <div className="whatsapp-popup__list">{conversations.map((conversation) => <button type="button" key={conversation.id} className={selected.id === conversation.id ? 'is-selected' : ''} onClick={() => setSelectedId(conversation.id)}><span className="whatsapp-popup__avatar">{conversation.initials}</span><span><strong>{conversation.name}</strong><small>{conversation.preview}</small></span><em>{conversation.unread ? '1' : conversation.time}</em></button>)}</div>
        <div className="whatsapp-popup__chat"><div className="whatsapp-popup__chat-title"><strong>{selected.name}</strong><small>{selected.id} · WhatsApp</small></div><div className="whatsapp-popup__messages">{selected.messages.map(([side, text, time], index) => <div key={index} className={`whatsapp-popup__message ${side}`}><span>{text}</span><small>{time} ✓✓</small></div>)}</div><button type="button" className="whatsapp-popup__action" onClick={() => { setIsOpen(false); navigate(`/requests/${selected.id}`); }}>Open patient request</button></div>
      </div>
    </section>}
  </>;
}
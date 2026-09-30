import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { createPatientRequest } from '../../../shared/bookingStore.js';
import { Icon } from '../../../shared/ui/index.js';
import './Chatbox.css';

const socket = io('http://localhost:3001');

/** Digits of a JID, whatever its domain. */
const userOf = (jid) => String(jid || '').split('@')[0].split(':')[0];

/** A JID that addresses a real phone number — not a LID, group or broadcast. */
const isPhoneJid = (jid) => /@(s\.whatsapp\.net|c\.us)$/.test(String(jid || ''));

/**
 * The contact's phone number, or '' when WhatsApp has not told us one.
 *
 * A "…@lid" JID is a privacy identifier, not a number: its digits are longer
 * than a phone number and have no country code, so they must never be shown or
 * copied onto a patient request. The real number comes from the service, which
 * resolves it through Baileys' LID mapping.
 */
const phoneOf = (chat) => {
  if (!chat) return '';
  if (chat.phone) return chat.phone;
  return isPhoneJid(chat.id) ? userOf(chat.id) : '';
};

/** For display: "+60123456789", or a plain note when the number is not known yet. */
const phoneLabel = (chat) => {
  const phone = phoneOf(chat);
  return phone ? `+${phone}` : 'Number not shared yet';
};

/** Two letters for the avatar; falls back to the last digits for a bare number. */
const initialsOf = (name, jid) => {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  const alpha = words.filter((word) => /\p{L}/u.test(word));
  if (alpha.length >= 2) return (alpha[0][0] + alpha[1][0]).toUpperCase();
  if (alpha.length === 1) return alpha[0].slice(0, 2).toUpperCase();
  return userOf(jid).slice(-2);
};

const clockOf = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dayKeyOf = (iso) => new Date(iso).toDateString();

const dayLabelOf = (iso) => {
  const day = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (day.toDateString() === today.toDateString()) return 'Today';
  if (day.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return day.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

const PARSED_LABELS = { name: 'Patient', age: 'Age', gender: 'Gender', careType: 'Care type', dateTime: 'Preferred time', location: 'Location' };

/**
 * The WhatsApp intake inbox: conversations on the left, the open thread on the
 * right, laid out like the WhatsApp desktop app.
 *
 * Contact names come from WhatsApp's `pushName` — the name the person set on
 * their own account. It is only meaningful on *incoming* messages (on our own
 * replies it is our name), so it is recorded for the contact only when the
 * message is inbound. Where WhatsApp gives no name we show the phone number,
 * and once a real name is known the number moves beneath it rather than being
 * thrown away.
 */
const Chatbox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [connectionState, setConnectionState] = useState('connecting');
  const [conversations, setConversations] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [newChatNumber, setNewChatNumber] = useState('');
  const [search, setSearch] = useState('');
  const [sendError, setSendError] = useState('');
  const threadRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('connection_state', setConnectionState);

    // Names the service already knew before this tab connected.
    socket.on('contacts', (contacts) => {
      if (!contacts || typeof contacts !== 'object') return;
      setConversations((prev) => {
        const next = { ...prev };
        Object.entries(contacts).forEach(([jid, name]) => {
          if (!name) return;
          next[jid] = next[jid]
            ? { ...next[jid], name, pushName: name }
            : { id: jid, name, pushName: name, tag: 'WA-REQ-NEW', messages: [] };
        });
        return next;
      });
    });

    // A number resolved after the fact (LID chats) — fill it in when it lands.
    const applyPhone = (jid, phone) => {
      if (!jid || !phone) return;
      setConversations((prev) => {
        const chat = prev[jid];
        if (!chat || chat.phone === phone) return prev;
        // Replace a placeholder name, but never a real WhatsApp display name.
        const name = chat.pushName || `+${phone}`;
        return { ...prev, [jid]: { ...chat, phone, name } };
      });
    };

    socket.on('contact_phone', ({ jid, phone }) => applyPhone(jid, phone));
    socket.on('contact_phones', (phones) => {
      if (!phones || typeof phones !== 'object') return;
      Object.entries(phones).forEach(([jid, phone]) => applyPhone(jid, phone));
    });

    socket.on('message', (msg) => {
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'Media message';
      const jid = msg.key.remoteJid;
      const isFromMe = msg.key.fromMe;
      // Our own outgoing messages carry OUR pushName — never the contact's.
      const incomingName = !isFromMe ? (msg.contactName || msg.pushName || msg.verifiedBizName) : null;

      setConversations((prev) => {
        const existing = prev[jid] || { id: jid, name: '', pushName: '', phone: '', tag: 'WA-REQ-NEW', messages: [] };
        const pushName = incomingName || existing.pushName || '';
        // The service resolves LID chats to a real number; keep whichever we have.
        const phone = msg.contactPhone || existing.phone || (isPhoneJid(jid) ? userOf(jid) : '');
        return {
          ...prev,
          [jid]: {
            ...existing,
            pushName,
            phone,
            name: pushName || (phone ? `+${phone}` : userOf(jid)),
            messages: [...existing.messages, { from: isFromMe ? 'Me' : jid, text, at: new Date().toISOString() }],
          },
        };
      });
    });

    // Without this the UI showed every outgoing message as delivered, even when
    // the service could not send it — a failed send looked identical to a
    // successful one. Now the bubble reports what actually happened.
    socket.on('message_sent', ({ to, clientId, success, error }) => {
      if (!to) return;
      setConversations((prev) => {
        const chat = prev[to];
        if (!chat) return prev;
        return {
          ...prev,
          [to]: {
            ...chat,
            messages: chat.messages.map((message) => (
              message.clientId && message.clientId === clientId
                ? { ...message, status: success ? 'sent' : 'failed', error: success ? '' : (error || 'Could not send.') }
                : message
            )),
          },
        };
      });
      if (!success) setSendError(error || 'Could not send the message.');
    });

    socket.on('patient_info_received', ({ sender, parsedData }) => {
      setConversations((prev) => (prev[sender] ? { ...prev, [sender]: { ...prev[sender], parsedData } } : prev));
    });

    socket.on('patient_location_received', ({ sender, location }) => {
      setConversations((prev) => {
        if (!prev[sender]) return prev;
        const current = prev[sender].parsedData || {};
        return { ...prev, [sender]: { ...prev[sender], parsedData: { ...current, location: location.address, lat: location.lat, lng: location.lng } } };
      });
    });

    return () => {
      socket.off('connection_state');
      socket.off('contacts');
      socket.off('contact_phone');
      socket.off('contact_phones');
      socket.off('message');
      socket.off('message_sent');
      socket.off('patient_info_received');
      socket.off('patient_location_received');
    };
  }, []);

  const activeConversation = activeChatId ? conversations[activeChatId] : null;

  // Follow the conversation as it grows, the way a chat app does.
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [activeChatId, activeConversation?.messages.length]);

  const chats = useMemo(() => {
    const term = search.trim().toLowerCase();
    return Object.values(conversations)
      .filter((chat) => !term || chat.name.toLowerCase().includes(term) || phoneOf(chat).includes(term))
      .sort((a, b) => {
        const at = a.messages[a.messages.length - 1]?.at || '';
        const bt = b.messages[b.messages.length - 1]?.at || '';
        return String(bt).localeCompare(String(at));
      });
  }, [conversations, search]);

  const sendMessage = () => {
    const text = newMessage.trim();
    if (!activeChatId || !text) return;
    if (connectionState !== 'connected') { setSendError('WhatsApp is not connected, so the message was not sent.'); return; }
    setSendError('');
    // Tagged so the service's reply can be matched back to this exact message:
    // until it lands the bubble shows as sending, not as delivered.
    const clientId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    socket.emit('send_message', { to: activeChatId, text, clientId });
    setConversations((prev) => ({
      ...prev,
      [activeChatId]: { ...prev[activeChatId], messages: [...prev[activeChatId].messages, { from: 'Me', text, at: new Date().toISOString(), clientId, status: 'sending' }] },
    }));
    setNewMessage('');
  };

  const startNewChat = () => {
    const digits = newChatNumber.replace(/\D/g, '');
    if (!digits) return;
    const id = `${digits}@s.whatsapp.net`;
    setConversations((prev) => (prev[id] ? prev : { ...prev, [id]: { id, name: digits, pushName: '', tag: 'WA-REQ-NEW', messages: [] } }));
    setActiveChatId(id);
    setNewChatNumber('');
  };

  const openRequest = () => {
    if (!activeConversation?.parsedData) return;
    // The resolved number, not the JID digits — a LID would not be dialable.
    const created = createPatientRequest(activeConversation.parsedData, activeConversation.id, phoneOf(activeConversation));
    setIsOpen(false);
    navigate(`/requests/${created.id}`);
  };

  const connected = connectionState === 'connected';

  if (!isOpen) {
    return (
      <button type="button" className="wa-launcher" onClick={() => setIsOpen(true)}>
        <span className={connected ? 'wa-launcher__dot wa-launcher__dot--on' : 'wa-launcher__dot'} />
        WhatsApp requests
        <span className="wa-launcher__count">{Object.keys(conversations).length}</span>
      </button>
    );
  }

  return (
    <section className={activeChatId ? 'wa wa--reading' : 'wa'} aria-label="WhatsApp requests">
      <header className="wa-head">
        <div>
          <h2 className="wa-head__title">WhatsApp requests</h2>
          <p className="wa-head__sub">Patient intake inbox</p>
        </div>
        <div className="wa-head__right">
          <span className={connected ? 'wa-status wa-status--on' : 'wa-status'}>
            <span className="wa-status__dot" />
            {connectionState}
          </span>
          <button type="button" className="wa-icon-button" onClick={() => setIsOpen(false)} aria-label="Close WhatsApp requests">
            <Icon name="close" size={18} />
          </button>
        </div>
      </header>

      <div className="wa-body">
        <div className="wa-rail">
          <div className="wa-rail__search">
            <label className="wa-field">
              <Icon name="search" size={15} />
              <input
                type="text"
                placeholder="Search or enter a number"
                value={search || newChatNumber}
                onChange={(event) => {
                  const value = event.target.value;
                  // Digits start a new chat; anything else filters the list.
                  if (/^[\d+\s-]*$/.test(value) && /\d/.test(value)) { setNewChatNumber(value); setSearch(''); }
                  else { setSearch(value); setNewChatNumber(''); }
                }}
                onKeyDown={(event) => { if (event.key === 'Enter' && newChatNumber) startNewChat(); }}
                aria-label="Search conversations or enter a new number"
              />
            </label>
            <button type="button" className="wa-add" onClick={startNewChat} disabled={!newChatNumber.replace(/\D/g, '')} aria-label="Start new chat">
              <Icon name="plus" size={17} />
            </button>
          </div>

          <div className="wa-list">
            {chats.map((chat) => {
              const last = chat.messages[chat.messages.length - 1];
              return (
                <button type="button" key={chat.id} className={chat.id === activeChatId ? 'wa-chat wa-chat--on' : 'wa-chat'} onClick={() => setActiveChatId(chat.id)}>
                  <span className="wa-avatar">{initialsOf(chat.name, chat.id)}</span>
                  <span className="wa-chat__body">
                    <span className="wa-chat__top">
                      <strong className="wa-chat__name">{chat.name || phoneLabel(chat)}</strong>
                      {last && <span className="wa-chat__time">{clockOf(new Date(last.at))}</span>}
                    </span>
                    <span className="wa-chat__preview">
                      {last ? `${last.from === 'Me' ? 'You: ' : ''}${last.text}` : 'No messages yet'}
                    </span>
                  </span>
                </button>
              );
            })}
            {chats.length === 0 && (
              <p className="wa-empty">{search ? 'No conversations match that search.' : 'No requests yet. Incoming WhatsApp messages appear here.'}</p>
            )}
          </div>
        </div>

        <div className="wa-main">
          {activeConversation ? (
            <>
              <div className="wa-convo-head">
                <button type="button" className="wa-icon-button wa-back" onClick={() => setActiveChatId(null)} aria-label="Back to conversations">
                  <Icon name="chevronLeft" size={18} />
                </button>
                <span className="wa-avatar">{initialsOf(activeConversation.name, activeConversation.id)}</span>
                <div>
                  <h3 className="wa-convo-head__name">{activeConversation.name || phoneLabel(activeConversation)}</h3>
                  {/* The real number, never the LID digits. Said plainly when
                      WhatsApp has not given us one, so it is not mistaken for a
                      number that could be dialled or filed on a request. */}
                  <p className={phoneOf(activeConversation) ? 'wa-convo-head__meta' : 'wa-convo-head__meta wa-convo-head__meta--unknown'}>
                    {phoneLabel(activeConversation)}
                  </p>
                </div>
              </div>

              <div className="wa-thread" ref={threadRef}>
                {activeConversation.messages.map((message, index) => {
                  const previous = activeConversation.messages[index - 1];
                  const newDay = !previous || dayKeyOf(previous.at) !== dayKeyOf(message.at);
                  const outgoing = message.from === 'Me';
                  // Name the sender at the start of each incoming run, as WhatsApp does.
                  const startsRun = !previous || previous.from !== message.from || newDay;
                  return (
                    <div key={`${message.at}-${index}`}>
                      {newDay && <div className="wa-daybreak"><span>{dayLabelOf(message.at)}</span></div>}
                      <div className={outgoing ? 'wa-row wa-row--out' : 'wa-row'}>
                        <div className="wa-bubble">
                          {!outgoing && startsRun && activeConversation.pushName && (
                            <span className="wa-bubble__author">{activeConversation.pushName}</span>
                          )}
                          {/* The float is declared before the text so it settles
                              onto the last line rather than pushing it down. */}
                          <span className="wa-bubble__meta">
                            {clockOf(new Date(message.at))}
                            {outgoing && message.status === 'sending' && <span className="wa-bubble__pending" title="Sending">🕓</span>}
                            {outgoing && message.status === 'failed' && <span className="wa-bubble__failed" title={message.error}>!</span>}
                            {outgoing && message.status !== 'sending' && message.status !== 'failed' && <Icon name="checkDouble" size={13} className="wa-bubble__tick" />}
                          </span>
                          <span className="wa-bubble__text">{message.text}</span>
                          {message.status === 'failed' && <span className="wa-bubble__error">{message.error}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activeConversation.messages.length === 0 && <p className="wa-empty">No messages in this conversation yet.</p>}
              </div>

              <div className="wa-foot">
                {!connected && (
                  <p className="wa-alert" role="status">
                    WhatsApp is not connected, so messages cannot be sent. Start the service with <code>npm run dev:whatsapp</code> and scan the QR code in that terminal.
                  </p>
                )}
                {connected && sendError && (
                  <p className="wa-alert" role="alert">
                    {sendError}
                    <button type="button" className="wa-alert__dismiss" onClick={() => setSendError('')} aria-label="Dismiss">×</button>
                  </p>
                )}
                {activeConversation.parsedData && (
                  <div className="wa-parsed">
                    <div className="wa-parsed__head">
                      <h4 className="wa-parsed__title">Details captured from this chat</h4>
                      <button type="button" className="wa-open-request" onClick={openRequest}>Open request</button>
                    </div>
                    {!phoneOf(activeConversation) && (
                      <p className="wa-parsed__warn">
                        WhatsApp has not shared this contact’s phone number, so the request will be created without one. Ask them for it in the chat before assigning a caregiver.
                      </p>
                    )}
                    <dl className="wa-parsed__grid">
                      {Object.entries(activeConversation.parsedData)
                        .filter(([key, value]) => value && key !== 'lat' && key !== 'lng')
                        .map(([key, value]) => (
                          <div className="wa-parsed__row" key={key}>
                            <dt>{PARSED_LABELS[key] || key}</dt>
                            <dd>{String(value)}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                )}

                <div className="wa-compose">
                  <label className="wa-field">
                    <input
                      type="text"
                      placeholder={connected ? 'Type a message' : 'WhatsApp not connected'}
                      value={newMessage}
                      onChange={(event) => setNewMessage(event.target.value)}
                      onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }}
                      disabled={!connected}
                      aria-label="Message"
                    />
                  </label>
                  <button type="button" className="wa-send" onClick={sendMessage} disabled={!connected || !newMessage.trim()} aria-label="Send message">
                    <Icon name="send" size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="wa-placeholder">Select a conversation to read and reply.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default Chatbox;

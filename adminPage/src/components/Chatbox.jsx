import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { createPatientRequest } from '../../../shared/bookingStore.js';

const socket = io('http://localhost:3001');

const Chatbox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [connectionState, setConnectionState] = useState('connecting');
  const [conversations, setConversations] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [newChatNumber, setNewChatNumber] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('connection_state', (state) => {
      setConnectionState(state);
    });

    socket.on('message', (msg) => {
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'Media Message';
      const fromId = msg.key.remoteJid;
      const isFromMe = msg.key.fromMe;
      
      // If it's an outgoing message, msg.pushName is OUR name, so ignore it.
      const incomingName = !isFromMe ? (msg.pushName || msg.verifiedBizName) : null;
      
      setConversations((prev) => {
        const fallbackName = fromId.split('@')[0];
        const existingName = prev[fromId]?.name;
        
        let finalName = existingName || fallbackName;
        if (incomingName && (!existingName || existingName === fallbackName)) {
          finalName = incomingName;
        }

        const existing = prev[fromId] || {
          id: fromId,
          name: finalName,
          initials: finalName.substring(0, 2).toUpperCase(),
          color: '#D1E7DD',
          tag: 'WA-REQ-NEW',
          messages: []
        };
        
        // Always ensure name is up to date
        existing.name = finalName;
        existing.initials = finalName.substring(0, 2).toUpperCase();
        
        return {
          ...prev,
          [fromId]: {
            ...existing,
            messages: [...existing.messages, { from: isFromMe ? 'Me' : fromId, text, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]
          }
        };
      });
    });

    socket.on('patient_info_received', ({ sender, parsedData }) => {
      setConversations((prev) => {
        if (!prev[sender]) return prev;
        return {
          ...prev,
          [sender]: {
            ...prev[sender],
            parsedData
          }
        };
      });
    });

    socket.on('patient_location_received', ({ sender, location }) => {
      setConversations((prev) => {
        if (!prev[sender]) return prev;
        const currentData = prev[sender].parsedData || {};
        return {
          ...prev,
          [sender]: {
            ...prev[sender],
            parsedData: { ...currentData, location: location.address, lat: location.lat, lng: location.lng }
          }
        };
      });
    });

    return () => {
      socket.off('connection_state');
      socket.off('message');
      socket.off('patient_info_received');
      socket.off('patient_location_received');
    };
  }, []);

  const sendMessage = () => {
    if (activeChatId && newMessage) {
      socket.emit('send_message', { to: activeChatId, text: newMessage });
      
      setConversations((prev) => ({
        ...prev,
        [activeChatId]: {
          ...prev[activeChatId],
          messages: [...prev[activeChatId].messages, { from: 'Me', text: newMessage, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]
        }
      }));
      setNewMessage('');
    }
  };

  const startNewChat = () => {
    if (newChatNumber) {
      const formatted = newChatNumber.replace(/\D/g, ''); // strip non-digits
      const id = `${formatted}@s.whatsapp.net`;
      if (!conversations[id]) {
        setConversations(prev => ({
          ...prev,
          [id]: {
            id,
            name: formatted,
            initials: formatted.substring(0, 2),
            color: '#E2F0CB',
            tag: 'WA-REQ-NEW',
            messages: []
          }
        }));
      }
      setActiveChatId(id);
      setNewChatNumber('');
    }
  };

  const activeConversation = activeChatId ? conversations[activeChatId] : null;

  if (!isOpen) {
    return (
      <div 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '20px', right: '20px', 
          backgroundColor: '#075E54', color: 'white', padding: '12px 24px', 
          borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
          fontFamily: 'Inter, sans-serif', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 9999
        }}
      >
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid white', backgroundColor: connectionState === 'connected' ? '#25D366' : 'transparent' }} />
        WhatsApp requests
        <span style={{ backgroundColor: 'white', color: '#075E54', borderRadius: '50%', padding: '2px 8px', fontSize: '12px', marginLeft: '4px' }}>
          {Object.keys(conversations).length}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px', width: '850px', height: '600px',
      backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, sans-serif',
      zIndex: 9999
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px', backgroundColor: '#008069', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>WhatsApp requests</h2>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>Patient intake inbox</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', backgroundColor: connectionState === 'connected' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)' }}>
            {connectionState}
          </span>
          <button 
            onClick={() => setIsOpen(false)}
            style={{ 
              background: 'transparent', border: '1px solid rgba(255,255,255,0.5)', color: 'white', 
              width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: '30%', borderRight: '1px solid #d1d7db', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid #f0f2f5', backgroundColor: '#f0f2f5', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="New chat number..."
              value={newChatNumber}
              onChange={(e) => setNewChatNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && startNewChat()}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none',
                fontSize: '14px', outline: 'none', backgroundColor: '#ffffff'
              }}
            />
            <button 
              onClick={startNewChat}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#008069',
                color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold'
              }}
            >
              +
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {Object.values(conversations).map((conv) => (
              <div 
                key={conv.id} 
                onClick={() => setActiveChatId(conv.id)}
                style={{ 
                  padding: '12px 16px', display: 'flex', gap: '15px', cursor: 'pointer',
                  backgroundColor: activeChatId === conv.id ? '#f0f2f5' : 'transparent',
                  borderBottom: '1px solid #f2f2f2'
                }}
              >
                <div style={{ 
                  width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#dfe5e7', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontWeight: 'bold', color: '#54656f', flexShrink: 0, fontSize: '18px'
                }}>
                  {conv.initials}
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: activeChatId === conv.id ? '700' : '500', color: '#333' }}>
                      {conv.name}
                    </h4>
                    <span style={{ fontSize: '11px', color: '#eb5757' }}>
                      {conv.messages[conv.messages.length - 1]?.time || ''}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conv.messages[conv.messages.length - 1]?.text || 'No messages yet'}
                  </p>
                </div>
              </div>
            ))}
            {Object.keys(conversations).length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                No active requests.<br/>Start a new chat or wait for incoming messages.
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#efeae2' }}>
          {activeConversation ? (
            <>
              <div style={{ padding: '10px 16px', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #d1d7db' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dfe5e7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#54656f' }}>
                  {activeConversation.initials}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#111b21', fontWeight: '500' }}>{activeConversation.name}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#667781' }}>{activeConversation.tag}</p>
                </div>
              </div>

              <div style={{ 
                flex: 1, padding: '24px 8%', overflowY: 'auto', 
                backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', 
                backgroundRepeat: 'repeat', backgroundColor: '#efeae2', backgroundSize: '400px'
              }}>
                {activeConversation.messages.map((m, idx) => (
                  <div key={idx} style={{
                    display: 'flex', flexDirection: 'column', marginBottom: '16px',
                    alignItems: m.from === 'Me' ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={{
                      maxWidth: '65%', padding: '6px 7px 8px 9px', borderRadius: '8px',
                      backgroundColor: m.from === 'Me' ? '#d9fdd3' : '#ffffff',
                      boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
                      position: 'relative',
                      borderTopLeftRadius: m.from === 'Me' ? '8px' : '0px',
                      borderTopRightRadius: m.from === 'Me' ? '0px' : '8px',
                      color: '#111b21'
                    }}>
                      <div style={{ fontSize: '14.2px', whiteSpace: 'pre-wrap', lineHeight: '19px', paddingRight: '40px', paddingBottom: '8px' }}>{m.text}</div>
                      <div style={{ fontSize: '11px', color: '#667781', position: 'absolute', bottom: '4px', right: '7px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {m.time} {m.from === 'Me' && <span style={{color: '#53bdeb', fontSize: '12px'}}>✓✓</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '10px 16px', backgroundColor: '#f0f2f5', display: 'flex', flexDirection: 'column' }}>
                {activeConversation.parsedData && (
                  <div style={{
                    backgroundColor: '#d9fdd3', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px',
                    boxShadow: '0 1px 0.5px rgba(11,20,26,.13)'
                  }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#008069' }}>Auto-filled Information:</h4>
                    <pre style={{ margin: 0, fontSize: '12px', color: '#111b21', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                      {JSON.stringify(activeConversation.parsedData, null, 2)}
                    </pre>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button 
                    onClick={() => {
                      if (activeConversation.parsedData) {
                        const newReq = createPatientRequest(activeConversation.parsedData, activeConversation.id);
                        setIsOpen(false);
                        navigate(`/requests/${newReq.id}`);
                      } else {
                        alert("No parsed data yet. Wait for patient to fill the form.");
                      }
                    }}
                    style={{
                    padding: '10px 16px', borderRadius: '8px', border: 'none',
                    backgroundColor: '#008069', color: 'white', fontWeight: '500', fontSize: '14px',
                    cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', whiteSpace: 'nowrap'
                  }}>
                    Open Request
                  </button>
                  <input
                    type="text"
                    placeholder="Type a message"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    style={{
                      flex: 1, padding: '12px 14px', borderRadius: '8px', border: 'none',
                      outline: 'none', fontSize: '15px', backgroundColor: '#ffffff', color: '#111b21'
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chatbox;

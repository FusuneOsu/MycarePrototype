import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

const Chatbox = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [connectionState, setConnectionState] = useState('connecting');
  const [conversations, setConversations] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [newChatNumber, setNewChatNumber] = useState('');

  useEffect(() => {
    socket.on('connection_state', (state) => {
      setConnectionState(state);
    });

    socket.on('message', (msg) => {
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'Media Message';
      const fromId = msg.key.remoteJid;
      
      setConversations((prev) => {
        const existing = prev[fromId] || {
          id: fromId,
          name: fromId.split('@')[0],
          initials: fromId.substring(0, 2),
          color: '#D1E7DD',
          tag: 'WA-REQ-NEW',
          messages: []
        };
        
        return {
          ...prev,
          [fromId]: {
            ...existing,
            messages: [...existing.messages, { from: fromId, text, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]
          }
        };
      });
    });

    return () => {
      socket.off('connection_state');
      socket.off('message');
    };
  }, []);

  const sendMessage = () => {
    if (activeChatId && newMessage) {
      if (connectionState !== 'connected') {
        alert('Cannot send message. WhatsApp is not connected. Please scan the QR code in the terminal.');
        return;
      }
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
        padding: '16px 24px', backgroundColor: '#0b6e50', color: 'white',
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
        <div style={{ width: '30%', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', backgroundColor: '#fafafa' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="New chat number (with country code)"
                value={newChatNumber}
                onChange={(e) => setNewChatNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && startNewChat()}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid #ddd',
                  fontSize: '12px', outline: 'none'
                }}
              />
              <button 
                onClick={startNewChat}
                style={{
                  padding: '8px 12px', borderRadius: '20px', border: 'none', backgroundColor: '#0b6e50',
                  color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'
                }}
              >
                +
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {Object.values(conversations).map((conv) => (
              <div 
                key={conv.id} 
                onClick={() => setActiveChatId(conv.id)}
                style={{ 
                  padding: '16px', display: 'flex', gap: '12px', cursor: 'pointer',
                  backgroundColor: activeChatId === conv.id ? '#e8f3ef' : 'transparent',
                  borderBottom: '1px solid #f0f0f0'
                }}
              >
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', backgroundColor: conv.color, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontWeight: 'bold', color: '#0b6e50', flexShrink: 0
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#ECE5DD' }}>
          {activeConversation ? (
            <>
              <div style={{ padding: '16px 24px', backgroundColor: 'white', borderBottom: '1px solid #eee' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>{activeConversation.name}</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#888' }}>{activeConversation.tag} · WhatsApp</p>
              </div>

              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundImage: 'radial-gradient(#d5cdc4 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                {activeConversation.messages.map((m, idx) => (
                  <div key={idx} style={{
                    display: 'flex', flexDirection: 'column', marginBottom: '16px',
                    alignItems: m.from === 'Me' ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={{
                      maxWidth: '75%', padding: '12px 16px', borderRadius: '8px',
                      backgroundColor: m.from === 'Me' ? '#dcf8c6' : 'white',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      position: 'relative',
                      borderTopLeftRadius: m.from === 'Me' ? '8px' : '0px',
                      borderTopRightRadius: m.from === 'Me' ? '0px' : '8px',
                    }}>
                      <div style={{ fontSize: '14px', color: '#333', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{m.text}</div>
                      <div style={{ fontSize: '11px', color: '#888', textAlign: 'right', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        {m.time} {m.from === 'Me' && <span style={{color: '#53bdeb'}}>✓✓</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f0f0f0' }}>
                <button style={{
                  width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#0b6e50', color: 'white', fontWeight: 'bold', fontSize: '14px',
                  cursor: 'pointer', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  Open patient request
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    style={{
                      flex: 1, padding: '14px 20px', borderRadius: '24px', border: 'none',
                      outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
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

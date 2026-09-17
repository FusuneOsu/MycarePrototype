import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Topbar.css';

function Topbar({ title, subtitle }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const openRequest = () => {
    setHasUnread(false);
    setIsOpen(false);
    navigate('/requests/WA-REQ-1001');
  };

  return (
    <header className="topbar">
      <div>
        <h1 className="topbar__title">{title}</h1>
        {subtitle && <p className="topbar__subtitle">{subtitle}</p>}
      </div>
      <div className="topbar__notifications">
        <button
          type="button"
          className="topbar__notification-button"
          aria-label={hasUnread ? 'Notifications, 1 unread' : 'Notifications'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span aria-hidden="true">♧</span>
          {hasUnread && <span className="topbar__notification-badge">1</span>}
        </button>
        {isOpen && (
          <div className="topbar__notification-panel">
            <div className="topbar__notification-heading">
              <strong>Notifications</strong>
              {hasUnread && <span>1 new</span>}
            </div>
            <button type="button" className="topbar__notification-item" onClick={openRequest}>
              <span className="topbar__notification-dot" />
              <span>
                <strong>New caregiver request</strong>
                <small>Received from WhatsApp · 2 min ago</small>
              </span>
              <span className="topbar__notification-arrow">›</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Topbar;

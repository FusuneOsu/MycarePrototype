import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeaderProfile, NotificationBell, PageHeader, todayLabel } from '../../../../../shared/ui/index.js';
import './Topbar.css';

/**
 * Page header for every admin page — the shared PageHeader with today's date,
 * the notification bell and the signed-in admin, as in the caregiver app.
 * `actions` renders page buttons to the left of the bell.
 */
function Topbar({ title, subtitle, eyebrow, actions }) {
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(true);

  const openRequest = (close) => {
    setHasUnread(false);
    close();
    navigate('/requests/WA-REQ-1001');
  };

  return (
    <PageHeader
      eyebrow={eyebrow ?? todayLabel()}
      title={title}
      subtitle={subtitle}
      actions={(
        <>
          {actions}
          <NotificationBell unread={hasUnread}>
            {(close) => (
              <>
                <div className="topbar__notification-heading">
                  <strong>Notifications</strong>
                  {hasUnread && <span>1 new</span>}
                </div>
                <button type="button" className="topbar__notification-item" onClick={() => openRequest(close)}>
                  <span className="topbar__notification-dot" />
                  <span>
                    <strong>New caregiver request</strong>
                    <small>Received from WhatsApp · 2 min ago</small>
                  </span>
                  <span className="topbar__notification-arrow">›</span>
                </button>
              </>
            )}
          </NotificationBell>
          <HeaderProfile initials="AD" name="Admin User" />
        </>
      )}
    />
  );
}

export default Topbar;

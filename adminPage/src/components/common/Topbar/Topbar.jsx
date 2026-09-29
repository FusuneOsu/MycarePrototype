import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { HeaderLogout, NotificationBell, PageHeader, todayLabel, Select } from '../../../../../shared/ui/index.js';
import { useLanguage } from '../../../../../shared/i18n/LanguageContext.jsx';
import './Topbar.css';

/**
 * Page header for every admin page — the shared PageHeader with today's date,
 * the notification bell and the log-out button, as in the caregiver app.
 * `actions` renders page buttons to the left of the bell.
 */
function Topbar({ title, subtitle, eyebrow, actions }) {
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(true);
  const { language, setLanguage, t } = useLanguage();
  const { onLogout } = useOutletContext() ?? {};

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
          <div className="topbar__language-toggle">
            <Select size="sm" aria-label="Select Language" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="ms">Bahasa Melayu</option>
              <option value="en">English</option>
              <option value="zh">中文 (Chinese)</option>
            </Select>
          </div>
          <NotificationBell unread={hasUnread}>
            {(close) => (
              <>
                <div className="topbar__notification-heading">
                  <strong>{t('nav.notifications')}</strong>
                  {hasUnread && <span>1 {t('nav.new')}</span>}
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
          {onLogout && <HeaderLogout onLogout={onLogout} label={t('nav.logout')} />}
        </>
      )}
    />
  );
}

export default Topbar;

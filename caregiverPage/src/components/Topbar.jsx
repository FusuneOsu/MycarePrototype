import { HeaderLogout, NotificationBell, PageHeader, Select, todayLabel } from '../../../shared/ui/index.js';
import { LANGUAGES, useLanguage } from '../../../shared/i18n/LanguageContext.jsx';

const ago = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * The shared page header. The bell lists booking notifications from the admin
 * (confirmed, rescheduled, cancelled); opening it marks them read.
 */
export default function Topbar({ page, profile, notifications = [], onReadNotifications, onOpenJob, onLogout }) {
  const { language, setLanguage, t } = useLanguage();
  const unread = notifications.some((item) => !item.read);
  return <PageHeader
    eyebrow={todayLabel()}
    title={t(`caregiver.title.${page}`).replace('{name}', profile.name.split(' ')[0])}
    subtitle={t(`caregiver.subtitle.${page}`)}
    actions={<>
      <div className="topbar-language">
        <Select size="sm" aria-label={t('nav.language')} value={language} onChange={(event) => setLanguage(event.target.value)}>
          {LANGUAGES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </div>
      <NotificationBell unread={unread} onClick={unread ? onReadNotifications : undefined}>
        {(close) => <div className="notice-list">
          <strong className="notice-list__title">{t('nav.notifications')}</strong>
          {notifications.length === 0 && <p className="notice-list__empty">{t('caregiver.notifications.empty')}</p>}
          {notifications.slice(0, 6).map((item) => <button type="button" key={item.id} className="notice" onClick={() => { close(); if (item.bookingId) onOpenJob(item.bookingId); }}>
            <span className={item.read ? 'notice__dot notice__dot--read' : 'notice__dot'} />
            <span><strong>{item.title}</strong><small>{item.body}</small><em>{ago(item.at)}</em></span>
          </button>)}
        </div>}
      </NotificationBell>
      <HeaderLogout onLogout={onLogout} label={t('nav.logout')} />
    </>}
  />;
}

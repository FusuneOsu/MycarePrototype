import { HeaderProfile, NotificationBell, PageHeader, todayLabel } from '../../../shared/ui/index.js';

const labels = { dashboard: ['Good morning, {name}', 'Here is your care overview for today.'], jobs: ['Your assigned jobs', 'See your route and each patient’s care plan.'], reports: ['Care reports', 'A clear pulse check on the care you delivered.'], detail: ['Job details', 'Everything about this booking, from your coordinator.'], profile: ['My profile', 'Your details, documents and availability on record.'] };

const ago = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * The shared page header. The bell lists booking notifications from the admin
 * (confirmed, rescheduled, cancelled); opening it marks them read.
 */
export default function Topbar({ page, profile, notifications = [], onReadNotifications, onOpenJob }) {
  const [title, subtitle] = labels[page];
  const unread = notifications.some((item) => !item.read);
  return <PageHeader
    eyebrow={todayLabel()}
    title={title.replace('{name}', profile.name.split(' ')[0])}
    subtitle={subtitle}
    actions={<>
      <NotificationBell unread={unread} onClick={unread ? onReadNotifications : undefined}>
        {(close) => <div className="notice-list">
          <strong className="notice-list__title">Notifications</strong>
          {notifications.length === 0 && <p className="notice-list__empty">No booking updates yet.</p>}
          {notifications.slice(0, 6).map((item) => <button type="button" key={item.id} className="notice" onClick={() => { close(); if (item.bookingId) onOpenJob(item.bookingId); }}>
            <span className={item.read ? 'notice__dot notice__dot--read' : 'notice__dot'} />
            <span><strong>{item.title}</strong><small>{item.body}</small><em>{ago(item.at)}</em></span>
          </button>)}
        </div>}
      </NotificationBell>
      <HeaderProfile initials={profile.initials} name={profile.name} />
    </>}
  />;
}

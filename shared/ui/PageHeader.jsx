import { useState } from 'react';
import { Avatar, cx } from './Avatar.jsx';

/** Today's date as the header eyebrow, e.g. "MONDAY, 21 SEPTEMBER 2026". */
export const todayLabel = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Green eyebrow, large title, muted subtitle, with actions on the right. */
export function PageHeader({ eyebrow, title, subtitle, actions, className }) {
  return (
    <header className={cx('ui-page-header', className)}>
      <div>
        {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
        <h1 className="ui-page-header__title">{title}</h1>
        {subtitle && <p className="ui-page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ui-page-header__actions">{actions}</div>}
    </header>
  );
}

/**
 * Bell with an unread dot. Pass `onClick` for a simple action, or children to
 * render a dropdown panel the bell toggles.
 */
export function NotificationBell({ unread = false, label = 'Notifications', onClick, children }) {
  const [open, setOpen] = useState(false);
  const toggle = () => { if (onClick) onClick(); if (children) setOpen((value) => !value); };
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="ui-bell" aria-label={unread ? `${label}, unread` : label} aria-expanded={children ? open : undefined} onClick={toggle}>
        <span aria-hidden="true">♧</span>
        {unread && <span className="ui-bell__dot" />}
      </button>
      {children && open && <div className="ui-popover">{typeof children === 'function' ? children(() => setOpen(false)) : children}</div>}
    </div>
  );
}

export function HeaderProfile({ initials, name }) {
  return <div className="ui-header-profile"><Avatar initials={initials} /><strong>{name}</strong></div>;
}

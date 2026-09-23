import { Avatar, cx } from './Avatar.jsx';

/**
 * The one sidebar used by both apps. Router-agnostic: each app decides which
 * item is active and what selecting it does.
 *
 * items:   [{ key, label, icon, active, onSelect }]
 * profile: { initials, name, role, active?, onSelect? } — clickable when onSelect is set
 */
export function Sidebar({ logoSrc, brandName, sectionLabel = 'Workspace', items, profile, language, onToggleLanguage, onLogout }) {
  return (
    <aside className="ui-sidebar">
      <div className="ui-sidebar__brand">
        {logoSrc && <img src={logoSrc} alt="My CareGivers logo" />}
        <span>{brandName}</span>
      </div>

      <div className="ui-sidebar__label">{sectionLabel}</div>
      <nav className="ui-sidebar__nav">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={cx('ui-sidebar__item', item.active && 'ui-sidebar__item--on')}
            aria-current={item.active ? 'page' : undefined}
            onClick={item.onSelect}
            title={item.label}
          >
            <i className={cx('ui-sidebar__icon', String(item.icon).length > 1 && 'ui-sidebar__icon--text')} aria-hidden="true">{item.icon}</i>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="ui-sidebar__bottom">
        {profile && (() => {
          const content = <><Avatar initials={profile.initials} /><div><strong>{profile.name}</strong><small>{profile.role}</small></div></>;
          return profile.onSelect
            ? <button type="button" className={cx('ui-sidebar__profile', profile.active && 'ui-sidebar__profile--on')} onClick={profile.onSelect} title="View my profile">{content}</button>
            : <div className="ui-sidebar__profile">{content}</div>;
        })()}
        {onLogout && <button type="button" className="ui-sidebar__logout" onClick={onLogout}>↪ &nbsp; Log out</button>}
      </div>
    </aside>
  );
}

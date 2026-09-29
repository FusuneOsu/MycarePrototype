import { useEffect, useState } from 'react';
import { Avatar, cx } from './Avatar.jsx';
import { Icon, ICONS } from './Icon.jsx';

const COLLAPSE_KEY = 'mycare.sidebarCollapsed';

/**
 * Word icons like "RM" are set smaller so they sit on the same optical line as
 * the drawn icons. Counted by code point, not `.length`: an emoji is a single
 * character but two UTF-16 units, and must not be shrunk as if it were text.
 */
const isTextIcon = (icon) => [...String(icon)].length > 1;

/** An `icon` naming an entry in the shared set draws as SVG; anything else is text. */
function ItemIcon({ icon }) {
  if (typeof icon === 'string' && ICONS[icon]) return <Icon name={icon} size={20} className="ui-sidebar__glyph" />;
  return <i className={cx('ui-sidebar__icon', isTextIcon(icon) && 'ui-sidebar__icon--text')} aria-hidden="true">{icon}</i>;
}

const readCollapsed = () => {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false; // private mode / blocked storage: just start expanded
  }
};

/**
 * The one sidebar used by both apps. Router-agnostic: each app decides which
 * item is active and what selecting it does.
 *
 * items:     [{ key, label, icon, active, onSelect }] — `icon` is a shared icon
 *            name (see Icon.jsx) or literal text like "RM"
 * profile:   { initials, name, role, active?, onSelect? } — clickable when onSelect is set
 * languages: [{ value, label }] — with onLanguageChange, renders the language picker
 *
 * Collapsing leaves an icon rail. The choice is remembered per browser, and
 * every label stays available as a tooltip while collapsed.
 */
export function Sidebar({ logoSrc, brandName, sectionLabel = 'Workspace', items, profile, language, languages, onLanguageChange, languageLabel = 'Language', onLogout, collapsible = true }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      // Not being able to remember the choice is not worth breaking the page for.
    }
  }, [collapsed]);

  return (
    <aside className={cx('ui-sidebar', collapsed && 'ui-sidebar--collapsed')} data-collapsed={collapsed ? 'true' : 'false'}>
      <div className="ui-sidebar__brand">
        {logoSrc && <img src={logoSrc} alt="My CareGivers logo" />}
        <span>{brandName}</span>
      </div>

      {collapsible && (
        <button
          type="button"
          className="ui-sidebar__collapse"
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
        </button>
      )}

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
            <ItemIcon icon={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="ui-sidebar__bottom">
        {languages && onLanguageChange && (
          <label className="ui-sidebar__language">
            <span className="ui-sidebar__language-label">{languageLabel}</span>
            <select value={language} onChange={(event) => onLanguageChange(event.target.value)} aria-label={languageLabel}>
              {languages.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        )}
        {profile && (() => {
          const content = <><Avatar initials={profile.initials} /><div><strong>{profile.name}</strong><small>{profile.role}</small></div></>;
          return profile.onSelect
            ? <button type="button" className={cx('ui-sidebar__profile', profile.active && 'ui-sidebar__profile--on')} onClick={profile.onSelect} title={profile.name}>{content}</button>
            : <div className="ui-sidebar__profile" title={profile.name}>{content}</div>;
        })()}
        {onLogout && (
          <button type="button" className="ui-sidebar__logout" onClick={onLogout} title="Log out">
            <Icon name="logout" size={18} className="ui-sidebar__glyph" />
            <span>Log out</span>
          </button>
        )}
      </div>
    </aside>
  );
}

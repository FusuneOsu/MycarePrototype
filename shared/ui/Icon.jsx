import { cx } from './Avatar.jsx';

/**
 * The shared line-icon set. Stroke-drawn on a 24x24 grid, inheriting the
 * surrounding text colour via `currentColor`, so one icon works on any
 * background and at any size without a second asset.
 *
 * Each entry is just the inner geometry — the <svg> wrapper, stroke weight and
 * line joins are applied once by <Icon>, which keeps every icon optically
 * consistent. Add a new icon by adding a path here, not by pasting an <svg>.
 */
export const ICONS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
  chart: <><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" rx="1" /><rect x="13" y="8" width="3" height="10" rx="1" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
  message: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></>,
  chat: <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.8-.9L3 20.5l1.6-4.9A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z" />,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1H9V4Z" /><path d="M9 11h6M9 15h4" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16.5 5.2a3.2 3.2 0 0 1 0 5.9" /><path d="M18 14.3a6.5 6.5 0 0 1 3.5 5.7" /></>,
  stethoscope: <><path d="M6 3v5a4 4 0 0 0 8 0V3" /><path d="M4 3h3M13 3h3" /><path d="M10 12v2a5 5 0 0 0 5 5 4 4 0 0 0 4-4v-2" /><circle cx="19" cy="10" r="2" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  home: <><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z" /><path d="M9 21v-7h6v7" /></>,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" /><path d="M13.7 20a2 2 0 0 1-3.4 0" /></>,
  send: <><path d="M21.5 2.5 2 10.5l7.5 3 3 7.5 9-18.5Z" /><path d="m9.5 13.5 4-4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chevronLeft: <path d="m14 6-6 6 6 6" />,
  chevronRight: <path d="m10 6 6 6-6 6" />,
  check: <path d="m4 12 5 5L20 6" />,
  checkDouble: <><path d="m1 12 5 5L16 6" /><path d="m11 16 1 1L23 6" /></>,
  phone: <path d="M21 16.9v2.5a2 2 0 0 1-2.2 2 19.5 19.5 0 0 1-8.5-3 19 19 0 0 1-5.9-5.9 19.5 19.5 0 0 1-3-8.6A2 2 0 0 1 3.4 2H6a2 2 0 0 1 2 1.7c.1 1 .3 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.1 9.8a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2Z" />,
  mapPin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  // Profile portraits: a man with short hair, and a woman in a headscarf.
  man: <><circle cx="12" cy="8.6" r="3.7" /><path d="M8.4 7.9c.6-2 2-3 3.8-3 1.5 0 2.8.7 3.4 2.2-1.6.2-3.4-.3-4.6-1.2-.7 1-1.6 1.6-2.6 2Z" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  womanHijab: <><path d="M6.4 11.2a5.6 5.6 0 0 1 11.2 0v3.3c0 1.6-1.1 2.8-2.7 3.2L12 18.5l-2.9-.8c-1.6-.4-2.7-1.6-2.7-3.2Z" /><circle cx="12" cy="10.6" r="2.7" /><path d="M4.5 21.5c.5-1.9 1.9-3.3 3.9-3.8M19.5 21.5c-.5-1.9-1.9-3.3-3.9-3.8" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  panelLeft: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-4" /></>,
  download: <><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
};

/**
 * `name` picks from ICONS. `size` sets both dimensions; the stroke stays
 * visually even across sizes because the viewBox scales with it.
 */
export function Icon({ name, size = 20, className, title, strokeWidth = 1.7, ...rest }) {
  const glyph = ICONS[name];
  if (!glyph) return null;
  return (
    <svg
      className={cx('ui-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title && <title>{title}</title>}
      {glyph}
    </svg>
  );
}

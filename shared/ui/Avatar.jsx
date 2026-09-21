const cx = (...names) => names.filter(Boolean).join(' ');

/** Initials in a circle. tone: '' (green) | 'blue' | 'coral'. */
export function Avatar({ initials, tone = '', className }) {
  return <span className={cx('ui-avatar', tone && `ui-avatar--${tone}`, className)}>{initials}</span>;
}

export { cx };

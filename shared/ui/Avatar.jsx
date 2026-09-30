import { Icon } from './Icon.jsx';

const cx = (...names) => names.filter(Boolean).join(' ');

/** The portrait icon for a gender value ('Male' / 'Female'), or null when unknown. */
export const genderIcon = (gender) => {
  const value = String(gender || '').trim().toLowerCase();
  if (value === 'male' || value === 'man') return 'man';
  if (value === 'female' || value === 'woman') return 'womanHijab';
  return null;
};

/**
 * A circle holding a portrait icon when `gender` is known, otherwise initials.
 * tone: '' (green) | 'blue' | 'coral'.
 */
export function Avatar({ initials, gender, tone = '', className }) {
  const icon = genderIcon(gender);
  return (
    <span className={cx('ui-avatar', icon && 'ui-avatar--icon', tone && `ui-avatar--${tone}`, className)}>
      {icon ? <Icon name={icon} size={22} strokeWidth={1.6} /> : initials}
    </span>
  );
}

export { cx };

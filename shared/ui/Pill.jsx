import { cx } from './Avatar.jsx';

/** Rounded status label. tone: 'success' | 'info' | 'warning' | 'pending' | 'danger' | 'neutral'. */
export function Pill({ tone = 'neutral', className, children }) {
  return <span className={cx('ui-pill', `ui-pill--${tone}`, className)}>{children}</span>;
}

/** Small grey tag that sits beside a name, e.g. "Applied online". */
export function Tag({ children }) {
  return <span className="ui-tag">{children}</span>;
}

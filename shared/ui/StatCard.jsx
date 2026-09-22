import { cx } from './Avatar.jsx';

/** Small label, big number, green note — the metric tile used on dashboards. tone: '' | 'warn' | 'gold'. */
export function StatCard({ label, value, note, icon, tone = '', active = false, onClick, className }) {
  const Tag = onClick ? 'button' : 'article';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={cx('ui-stat', tone && `ui-stat--${tone}`, active && 'ui-stat--active', className)}
      onClick={onClick}
      style={onClick ? { textAlign: 'left', font: 'inherit', cursor: 'pointer' } : undefined}
    >
      <div className="ui-stat__head"><span>{label}</span>{icon && <span className="ui-stat__icon" aria-hidden="true">{icon}</span>}</div>
      <h2 className="ui-stat__value">{value}</h2>
      {note && <small className="ui-stat__note">{note}</small>}
    </Tag>
  );
}

export function StatGrid({ children, className }) {
  return <section className={cx('ui-stats', className)}>{children}</section>;
}

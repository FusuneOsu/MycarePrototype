import { cx } from './Avatar.jsx';

/**
 * Underlined tabs. tabs: [{ id, label, flagged? }]. `fill` spreads them
 * evenly across the full width.
 */
export function Tabs({ tabs, value, onChange, fill = false, className, label = 'Sections' }) {
  return (
    <div className={cx('ui-tabs', fill && 'ui-tabs--fill', className)} role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          className={cx('ui-tab', value === tab.id && 'ui-tab--on')}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.flagged && <i className="ui-tab__dot" aria-label="needs attention" />}
        </button>
      ))}
    </div>
  );
}

/** Compact pill-style switch for 2–4 options, e.g. Month / Week / Day. options: [{ id, label }]. */
export function Segmented({ options, value, onChange, className, label = 'View' }) {
  return (
    <div className={cx('ui-segmented', className)} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          className={cx('ui-segmented__option', value === option.id && 'ui-segmented__option--on')}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

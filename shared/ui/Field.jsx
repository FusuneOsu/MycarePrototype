import { cx } from './Avatar.jsx';

/** Label wrapping a control, with an optional hint underneath. */
export function Field({ label, hint, className, children }) {
  return (
    <label className={cx('ui-field', className)}>
      {label}
      {children}
      {hint && <small className="ui-field__hint">{hint}</small>}
    </label>
  );
}

/** size 'sm' is the compact control used in toolbars and filters. */
export function Input({ size = 'md', className, ...rest }) {
  return <input className={cx('ui-input', size === 'sm' && 'ui-input--sm', className)} {...rest} />;
}

export function Select({ size = 'md', className, children, ...rest }) {
  return <select className={cx('ui-select', size === 'sm' && 'ui-select--sm', className)} {...rest}>{children}</select>;
}

export function Textarea({ className, ...rest }) {
  return <textarea className={cx('ui-textarea', className)} {...rest} />;
}

/** A wrapping row of filters / search / actions. */
export function Toolbar({ className, children }) {
  return <div className={cx('ui-toolbar', className)}>{children}</div>;
}

import { cx } from './Avatar.jsx';

/**
 * variant: 'primary' (solid green) | 'secondary' (outlined) | 'danger' | 'link'
 * size: 'md' | 'sm'. Pass `href` to render a link that looks like a button.
 */
export function Button({ variant = 'secondary', size = 'md', block = false, href, className, children, type = 'button', ...rest }) {
  const classes = cx('ui-btn', `ui-btn--${variant}`, size === 'sm' && 'ui-btn--sm', block && 'ui-btn--block', className);
  if (href) return <a className={classes} href={href} {...rest}>{children}</a>;
  return <button type={type} className={classes} {...rest}>{children}</button>;
}

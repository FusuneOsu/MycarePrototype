import { cx } from './Avatar.jsx';

/**
 * White panel with border and soft shadow. Give it a `title` (and optional
 * `action`) for the standard header row; `padded` for page-level cards.
 * variant: 'default' | 'flat' | 'tint'.
 */
export function Card({ title, action, padded = false, variant = 'default', className, bodyClassName, children, as: Tag = 'section', ...rest }) {
  return (
    <Tag className={cx('ui-card', padded && 'ui-card--padded', variant !== 'default' && `ui-card--${variant}`, className)} {...rest}>
      {(title || action) && (
        <div className="ui-card__head">
          {title && <h3 className="ui-card__title">{title}</h3>}
          {action}
        </div>
      )}
      {title || action ? <div className={cx('ui-card__body', bodyClassName)}>{children}</div> : children}
    </Tag>
  );
}

/** Eyebrow + heading + intro, with actions on the right — the top of a page card. */
export function SectionHeader({ eyebrow, title, intro, actions, className }) {
  return (
    <div className={cx('ui-section-head', className)}>
      <div>
        {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
        {title && <h2 className="ui-section-head__title">{title}</h2>}
        {intro && <p className="ui-section-head__intro">{intro}</p>}
      </div>
      {actions && <div className="ui-page-header__actions">{actions}</div>}
    </div>
  );
}

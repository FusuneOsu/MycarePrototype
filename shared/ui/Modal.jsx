import { useEffect } from 'react';
import { cx } from './Avatar.jsx';

/**
 * Dialog with overlay, header (title + optional description), scrolling body
 * and an optional sticky footer for actions. Closes on Escape and overlay click.
 * size: 'sm' (400px) | 'md' (560px) | 'lg' (720px).
 */
export function Modal({ isOpen, onClose, title, description, footer, size = 'md', className, children }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={cx('ui-modal', `ui-modal--${size}`, className)} role="dialog" aria-modal="true" aria-label={title}>
        {title && (
          <div className="ui-modal__header">
            <div>
              <h2 className="ui-modal__title">{title}</h2>
              {description && <p className="ui-modal__description">{description}</p>}
            </div>
            <button type="button" className="ui-modal__close" onClick={onClose} aria-label="Close dialog">✕</button>
          </div>
        )}
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

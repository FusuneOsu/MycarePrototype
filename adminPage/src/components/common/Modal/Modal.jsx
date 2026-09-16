import { useEffect } from 'react';
import './Modal.css';

function Modal({ isOpen, onClose, title, size = 'md', children }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayClick}>
      <div
        className={`modal-panel modal-panel--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && (
          <div className="modal-panel__header">
            <h2 className="modal-panel__title">{title}</h2>
            <button
              type="button"
              className="modal-panel__close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>
        )}
        <div className="modal-panel__body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;

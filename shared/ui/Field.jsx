import { useState, useRef, useEffect, Children } from 'react';
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

export function Select({ size = 'md', className, children, value, onChange, 'aria-label': ariaLabel, ...rest }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = [];
  Children.forEach(children, (child) => {
    if (child && child.type === 'option') {
      options.push({ value: child.props.value, label: child.props.children });
    }
  });

  const selectedOption = options.find(o => String(o.value) === String(value)) || options[0];

  const handleSelect = (val) => {
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { value: val } });
    }
  };

  return (
    <div className={cx('ui-custom-select', size === 'sm' && 'ui-custom-select--sm', className)} ref={containerRef} {...rest}>
      <button type="button" className="ui-custom-select__trigger" onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }} aria-label={ariaLabel}>
        <span className="ui-custom-select__label">{selectedOption ? selectedOption.label : 'Select...'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ui-custom-select__icon"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      
      {isOpen && (
        <>
          <div className="ui-custom-select__overlay" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div className="ui-custom-select__menu">
            {options.map((opt) => (
              <button 
                key={opt.value}
                type="button" 
                className={cx('ui-custom-select__option', String(opt.value) === String(value) && 'is-selected')}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(opt.value); }}
              >
                <span>{opt.label}</span>
                {String(opt.value) === String(value) && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Textarea({ className, ...rest }) {
  return <textarea className={cx('ui-textarea', className)} {...rest} />;
}

/** A wrapping row of filters / search / actions. */
export function Toolbar({ className, children }) {
  return <div className={cx('ui-toolbar', className)}>{children}</div>;
}

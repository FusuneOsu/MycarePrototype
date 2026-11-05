import { useEffect } from 'react';
import './BranchToast.css';

export default function BranchToast({ message, type = 'success', onDismiss }) {
  useEffect(() => {
    if (!message || !onDismiss) return undefined;
    const timeoutId = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timeoutId);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div className={`branch-toast branch-toast--${type}`} role={type === 'error' ? 'alert' : 'status'} aria-live="polite">
      <span>{message}</span>
      {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss message">×</button>}
    </div>
  );
}

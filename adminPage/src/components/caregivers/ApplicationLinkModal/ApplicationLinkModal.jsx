import { useState } from 'react';
import Modal from '../../common/Modal/Modal.jsx';
import './ApplicationLinkModal.css';

// The caregiver app opens straight into the application form when ?apply=1 is set.
function applicationUrl() {
  const base = import.meta.env.VITE_CAREGIVER_URL || '/caregiver/';
  const url = new URL(base, window.location.origin);
  url.searchParams.set('apply', '1');
  return url.toString();
}

/** A link the admin can post on WhatsApp or the website to recruit caregivers. */
function ApplicationLinkModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const link = applicationUrl();
  const message = `Join My CareGivers as a caregiver. Apply here: ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Caregiver application link" size="md">
      <p className="application-link__lead">
        Share this link on WhatsApp or your website. It opens the application form directly. Applications appear in the Caregivers list as Pending approval.
      </p>
      <div className="application-link__row">
        <input className="application-link__input" readOnly value={link} onFocus={(event) => event.target.select()} aria-label="Application link" />
        <button type="button" className="application-link__btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <a
        className="application-link__whatsapp"
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
      >
        Share on WhatsApp
      </a>
    </Modal>
  );
}

export default ApplicationLinkModal;

import { useState } from 'react';
import { Button, Modal } from '../../../shared/ui/index.js';
import { navigationLinks } from '../../../shared/bookingStore.js';

/**
 * "How do you want to get there?" — opens Google Maps, Waze or Apple Maps with
 * the client's location as the destination. On a phone these links open the
 * installed app; on a computer they open the website.
 */
export default function NavigateSheet({ job, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!job) return null;
  const { booking } = job;
  const links = navigationLinks(booking);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(booking.address);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="sm" title={`Navigate to ${booking.patientName}`} description={booking.address}>
      <div className="navigate-options">
        <Button variant="primary" block href={links.google} target="_blank" rel="noreferrer"><span aria-hidden="true">◉</span> Google Maps</Button>
        <Button block href={links.waze} target="_blank" rel="noreferrer"><span aria-hidden="true">◈</span> Waze</Button>
        <Button block href={links.apple} target="_blank" rel="noreferrer"><span aria-hidden="true">◎</span> Apple Maps</Button>
        <Button variant="link" onClick={copy}>{copied ? 'Address copied' : 'Copy address'}</Button>
      </div>
      <p className="navigate-hint">{booking.startTime}–{booking.endTime} · {job.dateLabel}. Opens the app on your phone, or the website on a computer.</p>
    </Modal>
  );
}

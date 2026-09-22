import { Button } from '../../../../../shared/ui/index.js';

function CaregiverActionBar({ onNewCaregiverClick, onShareLinkClick }) {
  // PTO requests are not wired up to a flow yet.
  const requestPto = () => window.alert('PTO Request: not wired up yet.');

  return (
    <>
      <Button variant="secondary" onClick={onShareLinkClick}>Share application link</Button>
      <Button variant="secondary" onClick={requestPto}>PTO Request</Button>
      <Button variant="primary" size="sm" onClick={onNewCaregiverClick}>+ New Caregiver</Button>
    </>
  );
}

export default CaregiverActionBar;

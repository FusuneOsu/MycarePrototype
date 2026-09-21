import NewCaregiverButton from '../NewCaregiverButton/NewCaregiverButton.jsx';
import PTORequestButton from '../PTORequestButton/PTORequestButton.jsx';
import './CaregiverActionBar.css';

function CaregiverActionBar({ onNewCaregiverClick, onShareLinkClick }) {
  return (
    <div className="caregiver-action-bar">
      <button type="button" className="caregiver-action-bar__link" onClick={onShareLinkClick}>
        Share application link
      </button>
      <PTORequestButton />
      <NewCaregiverButton onClick={onNewCaregiverClick} />
    </div>
  );
}

export default CaregiverActionBar;

import './NewCaregiverButton.css';

function NewCaregiverButton({ onClick }) {
  return (
    <button type="button" className="new-caregiver-btn" onClick={onClick}>
      + New Caregiver
    </button>
  );
}

export default NewCaregiverButton;

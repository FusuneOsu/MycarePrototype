import './NewCaregiverButton.css';

function NewCaregiverButton() {
  // Dummy for now — wire up to a create-caregiver form/modal later.
  const handleClick = () => {
    alert('New Caregiver: not wired up yet.');
  };

  return (
    <button type="button" className="new-caregiver-btn" onClick={handleClick}>
      + New Caregiver
    </button>
  );
}

export default NewCaregiverButton;

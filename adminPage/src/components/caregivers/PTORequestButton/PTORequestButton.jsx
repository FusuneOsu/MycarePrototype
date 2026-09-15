import './PTORequestButton.css';

function PTORequestButton() {
  // Dummy for now — wire up to a PTO request flow later.
  const handleClick = () => {
    alert('PTO Request: not wired up yet.');
  };

  return (
    <button type="button" className="pto-request-btn" onClick={handleClick}>
      PTO Request
    </button>
  );
}

export default PTORequestButton;

import './WizardProgress.css';

function WizardProgress({ steps, currentStep }) {
  return (
    <div className="wizard-progress">
      {steps.map((label, index) => {
        const isComplete = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={label} className="wizard-progress__item">
            <div
              className={
                'wizard-progress__dot' +
                (isActive ? ' wizard-progress__dot--active' : '') +
                (isComplete ? ' wizard-progress__dot--complete' : '')
              }
            >
              {isComplete ? '✓' : index + 1}
            </div>
            <span
              className={
                'wizard-progress__label' +
                (isActive ? ' wizard-progress__label--active' : '')
              }
            >
              {label}
            </span>
            {index < steps.length - 1 && (
              <div
                className={
                  'wizard-progress__connector' +
                  (isComplete ? ' wizard-progress__connector--complete' : '')
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default WizardProgress;

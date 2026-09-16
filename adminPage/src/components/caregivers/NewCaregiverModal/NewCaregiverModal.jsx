import { useState } from 'react';
import Modal from '../../common/Modal/Modal.jsx';
import WizardProgress from './WizardProgress/WizardProgress.jsx';
import CaregiverDetailsStep from './steps/CaregiverDetailsStep/CaregiverDetailsStep.jsx';
import CenterDetailsStep from './steps/CenterDetailsStep/CenterDetailsStep.jsx';
import AssignmentReportingStep from './steps/AssignmentReportingStep/AssignmentReportingStep.jsx';
import { getNextCaregiverId } from '../../../utils/ids.js';
import './NewCaregiverModal.css';

const STEP_LABELS = ['Caregiver Details', 'Center Details', 'Assignment Reporting'];

function getInitialFormData(caregivers) {
  return {
    id: getNextCaregiverId(caregivers),
    name: '',
    username: '',
    gender: '',
    languages: [],
    travelMode: '',
    centerPlace: '',
    workAccommodations: '',
    autoAssigned: 'No',
    managerName: '',
    managerId: '',
  };
}

function isStepValid(step, formData) {
  if (step === 0) {
    return (
      formData.id.trim() &&
      formData.name.trim() &&
      formData.username.trim() &&
      formData.gender &&
      formData.languages.length > 0
    );
  }
  if (step === 1) {
    return formData.travelMode && formData.centerPlace;
  }
  return true; // Assignment Reporting has no required fields yet
}

function NewCaregiverModal({ isOpen, onClose, caregivers, onCreateCaregiver }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [formData, setFormData] = useState(() => getInitialFormData(caregivers));

  const resetAndClose = () => {
    setStep(0);
    setDirection('forward');
    setFormData(getInitialFormData(caregivers));
    onClose();
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const goNext = () => {
    if (step >= STEP_LABELS.length - 1) return;
    setDirection('forward');
    setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step <= 0) return;
    setDirection('back');
    setStep((s) => s - 1);
  };

  const handleSubmit = () => {
    onCreateCaregiver({
      id: formData.id.trim(),
      name: formData.name.trim(),
      gender: formData.gender,
      center: formData.centerPlace,
      availability: 'Available',
      username: formData.username.trim(),
      languages: formData.languages,
      travelMode: formData.travelMode,
      workAccommodations: formData.workAccommodations,
      autoAssigned: formData.autoAssigned,
      managerName: formData.managerName.trim(),
      managerId: formData.managerId,
    });
    resetAndClose();
  };

  const stepValid = isStepValid(step, formData);
  const isLastStep = step === STEP_LABELS.length - 1;

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="New Caregiver" size="lg">
      <WizardProgress steps={STEP_LABELS} currentStep={step} />

      <div className="new-caregiver-modal__step-viewport">
        <div key={step} className={`new-caregiver-modal__step new-caregiver-modal__step--${direction}`}>
          {step === 0 && (
            <CaregiverDetailsStep formData={formData} onFieldChange={handleFieldChange} />
          )}
          {step === 1 && (
            <CenterDetailsStep formData={formData} onFieldChange={handleFieldChange} />
          )}
          {step === 2 && (
            <AssignmentReportingStep formData={formData} onFieldChange={handleFieldChange} />
          )}
        </div>
      </div>

      <div className="new-caregiver-modal__footer">
        <button
          type="button"
          className="new-caregiver-modal__btn new-caregiver-modal__btn--ghost"
          onClick={step === 0 ? resetAndClose : goBack}
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </button>

        {isLastStep ? (
          <button
            type="button"
            className="new-caregiver-modal__btn new-caregiver-modal__btn--primary"
            onClick={handleSubmit}
            disabled={!stepValid}
          >
            Add Caregiver
          </button>
        ) : (
          <button
            type="button"
            className="new-caregiver-modal__btn new-caregiver-modal__btn--primary"
            onClick={goNext}
            disabled={!stepValid}
          >
            Next
          </button>
        )}
      </div>
    </Modal>
  );
}

export default NewCaregiverModal;

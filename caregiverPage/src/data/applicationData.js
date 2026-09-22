// The application store lives in shared/ because the admin review queue reads
// and writes the same records. This module is the caregiver app's view of it.
export {
  APPLICATIONS_KEY, APPLICATION_STEPS, STATUS, STATUS_TIMELINE, documentSlots,
  blankApplication, listApplications, getApplication, findApplicationByLogin,
  startApplication, saveApplication, submitApplication, setApplicationStatus,
  isStepComplete, isApplicationComplete,
} from '../../../shared/caregiverStore.js';

export {
  CENTERS as centers, COVERAGE_AREAS as coverageAreaOptions, EXPERIENCE_BANDS as experienceBands, GENDERS as genders,
  LANGUAGES as languageOptions, SHIFTS as shiftOptions, SPECIALISATIONS as specialisationOptions,
  STATES as states, TRAVEL_MODES as travelModes, WORKING_DAYS as workingDayOptions,
} from '../../../shared/careVocabulary.js';

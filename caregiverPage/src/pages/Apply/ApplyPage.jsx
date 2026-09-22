import { useState } from 'react';
import { Brand } from '../../components/common.jsx';
import { TextField, SelectField, TextareaField, ChipGroup, ChoiceRow, FileSlot } from '../../components/fields.jsx';
import {
  APPLICATION_STEPS, blankApplication, centers, coverageAreaOptions, documentSlots, experienceBands, genders,
  getApplication, isApplicationComplete, isStepComplete, languageOptions, saveApplication, shiftOptions,
  specialisationOptions, startApplication, submitApplication, travelModes, workingDayOptions,
} from '../../data/applicationData.js';

const summary = (data) => [
  ['Full name', data.fullName], ['Email', data.email], ['Phone', data.phone],
  ['Gender', data.gender], ['IC / passport', data.idNumber],
  ['Experience', data.experienceBand], ['Previous employer', data.previousEmployer || '—'],
  ['Specialisations', data.specialisations.join(', ')], ['Languages', data.languages.join(', ')],
  ['Center', data.preferredCenter], ['Coverage areas', (data.coverageAreas || []).join(', ')], ['Working days', data.workingDays.join(', ')],
  ['Shift preference', data.shift], ['Travel mode', data.travelMode || '—'],
  ['Earliest start date', data.startDate || 'As soon as possible'],
];

/**
 * `editing` = the admin did not approve it and sent it back with a reason.
 * The applicant edits in place and resubmits: the email is locked because it
 * keys the record, the account fields are hidden, and every step is reachable.
 */
export default function ApplyPage({ resume, editing = false, onCancel, onSubmitted, onResume, onNotify }) {
  const [step, setStep] = useState(() => (editing ? 0 : resume ? Math.min(resume.step, APPLICATION_STEPS.length - 1) : 0));
  const [data, setData] = useState(() => (resume ? { ...blankApplication(), ...resume.data } : blankApplication()));
  const [password, setPassword] = useState(resume?.password || '');
  const [confirm, setConfirm] = useState(resume?.password || '');
  const [declared, setDeclared] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (value) => setData((prev) => ({ ...prev, [field]: value }));
  const setDocument = (id, file) => setData((prev) => ({ ...prev, documents: { ...prev.documents, [id]: file } }));
  const clearDocument = (id) => setData((prev) => { const next = { ...prev.documents }; delete next[id]; return { ...prev, documents: next }; });

  const goNext = () => {
    setError('');
    if (!isStepComplete(step, data)) { setError('Please complete the required fields marked with *.'); return; }

    if (step === 0 && editing) {
      saveApplication(data.email, { data });
      setStep(1);
      return;
    }

    if (step === 0) {
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
      if (password !== confirm) { setError('Both passwords must match.'); return; }
      const existing = getApplication(data.email);
      if (existing && existing.password !== password) { setError('An application already exists for this email. Sign in to continue it.'); return; }
      const saved = startApplication({ fullName: data.fullName, email: data.email, password });
      saveApplication(data.email, { step: 1, data });
      if (existing) {
        // Someone re-entering the wizard with credentials they already used: pick their draft back up.
        setData({ ...blankApplication(), ...saved.data, ...data });
        setStep(Math.min(saved.step, APPLICATION_STEPS.length - 1));
        onNotify('Welcome back — we restored your saved application.');
        return;
      }
      onNotify('Draft saved. You can leave and come back at any time.');
      setStep(1);
      return;
    }

    saveApplication(data.email, { step: step + 1, data });
    setStep(step + 1);
  };

  const goBack = () => { setError(''); if (step === 0) { onCancel(); return; } saveApplication(data.email, { step: step - 1, data }); setStep(step - 1); };

  const submit = () => {
    if (!isApplicationComplete(data)) { setError('Some required details are missing. Use the steps on the left to find them.'); return; }
    if (!declared) { setError('Please confirm the declaration before submitting.'); return; }
    saveApplication(data.email, { data });
    submitApplication(data.email);
    onSubmitted({ role: 'caregiver', email: data.email, name: data.fullName });
  };

  const saveAndExit = () => {
    // A returned application keeps its status; only a draft tracks the step reached.
    if (data.email) saveApplication(data.email, editing ? { data } : { step, data });
    onNotify(editing ? 'Your changes are saved. Resubmit when you are ready.' : 'Your application draft has been saved.');
    onCancel();
  };

  const jumpTo = (index) => { if (!editing || index === step) return; setError(''); saveApplication(data.email, { data }); setStep(index); };

  const bodies = [
    <div className="apply-fields" key="details">
      {editing && resume?.reviewNote && <div className="status-note status-note--warn apply-returned"><strong>Reason from your coordinator</strong><p>{resume.reviewNote}</p></div>}
      <p className="apply-lead">{editing ? 'Update anything that needs fixing — you can jump straight to any step on the left.' : 'Just the essentials for now.'}{editing ? '' : ' Creating your account here lets you save your progress and track the review — you will fill in the rest of your profile once you are approved.'}</p>
      <TextField label="Full name (as per IC or passport)" value={data.fullName} onChange={set('fullName')} placeholder="Your full name" required />
      <div className="apply-row"><TextField label="Email address" type="email" value={data.email} onChange={set('email')} placeholder="you@example.com" required disabled={editing} /><TextField label="Phone number" value={data.phone} onChange={set('phone')} placeholder="+60 12-345 6789" required /></div>
      <div className="apply-row"><ChoiceRow label="Gender" value={data.gender} onChange={set('gender')} options={genders} required /><TextField label="IC or passport number" value={data.idNumber} onChange={set('idNumber')} placeholder="940608-14-5522" required /></div>
      {!editing && <>
        <div className="apply-row">
          <TextField label="Create password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" required />
          <TextField label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="Re-enter password" required />
        </div>
        <p className="apply-note">Already started? <button type="button" className="link-button" onClick={onResume}>Sign in to continue your application</button></p>
      </>}
    </div>,

    <div className="apply-fields" key="experience">
      <div className="apply-row"><SelectField label="Years of caregiving experience" value={data.experienceBand} onChange={set('experienceBand')} options={experienceBands} required /><TextField label="Most recent employer" value={data.previousEmployer} onChange={set('previousEmployer')} placeholder="Clinic, hospital or agency" /></div>
      <ChipGroup label="Specialisations" values={data.specialisations} onChange={set('specialisations')} options={specialisationOptions} hint="Pick every area you are confident working in." required />
      <ChipGroup label="Languages spoken" values={data.languages} onChange={set('languages')} options={languageOptions} required />
      <TextareaField label="Short introduction" value={data.bio} onChange={set('bio')} placeholder="Tell us how you work and the kind of care you are best at." hint="Families see this once you are approved." />
      <h4 className="apply-subhead">Availability</h4>
      <SelectField label="Center" value={data.preferredCenter} onChange={set('preferredCenter')} options={centers} required />
      <ChipGroup label="Coverage areas" values={data.coverageAreas || []} onChange={set('coverageAreas')} options={coverageAreaOptions} hint="Every area you are willing to travel to for home visits." required />
      <ChipGroup label="Working days" values={data.workingDays} onChange={set('workingDays')} options={workingDayOptions} required />
      <ChoiceRow label="Shift preference" value={data.shift} onChange={set('shift')} options={shiftOptions} required />
      <div className="apply-row"><SelectField label="Travel mode" value={data.travelMode} onChange={set('travelMode')} options={travelModes} /><TextField label="Earliest start date" type="date" value={data.startDate} onChange={set('startDate')} /></div>
    </div>,

    <div className="apply-fields" key="documents">
      <p className="apply-lead">Upload clear copies of your documents. PDF, JPG or PNG. You can come back and finish this later — your progress is saved.</p>
      <div className="slots">{documentSlots.map((slot) => <FileSlot key={slot.id} slot={slot} file={data.documents[slot.id]} onSelect={setDocument} onClear={clearDocument} />)}</div>
      <p className="apply-note">Certificates are checked against the issuing body during review, so please make sure names and dates are readable.</p>
    </div>,

    <div className="apply-fields" key="review">
      <p className="apply-lead">Check everything below, then submit. Our team reviews applications within 3 working days.</p>
      <div className="review-grid">{summary(data).map(([label, value]) => <div className="review-row" key={label}><span>{label}</span><strong>{value || '—'}</strong></div>)}</div>
      <h4 className="apply-subhead">Documents</h4>
      <div className="review-grid">{documentSlots.map((slot) => <div className="review-row" key={slot.id}><span>{slot.label}</span><strong>{data.documents[slot.id]?.name || 'Not uploaded'}</strong></div>)}</div>
      <label className="declare"><input type="checkbox" checked={declared} onChange={(event) => setDeclared(event.target.checked)} /><span>I confirm the information and documents above are accurate, and I consent to My CareGivers verifying my certificates with the issuing bodies.</span></label>
    </div>,
  ];

  const isLast = step === APPLICATION_STEPS.length - 1;

  return <section className="apply">
    <header className="apply-top"><Brand /><button type="button" className="back" onClick={saveAndExit}>Save &amp; exit</button></header>
    <div className="apply-shell">
      <ol className={editing ? 'apply-steps apply-steps--jump' : 'apply-steps'}>{APPLICATION_STEPS.map((label, index) => <li key={label} className={index === step ? 'on' : index < step ? 'done' : ''} onClick={() => jumpTo(index)}><i>{index < step ? '✓' : index + 1}</i><span>{label}</span></li>)}</ol>
      <div className="apply-card panel">
        <div className="apply-head"><p className="eyebrow">Step {step + 1} of {APPLICATION_STEPS.length}</p><h2>{APPLICATION_STEPS[step]}</h2></div>
        {bodies[step]}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="apply-actions"><button type="button" className="back" onClick={goBack}>{step === 0 ? 'Cancel' : '‹ Back'}</button>{isLast ? <button type="button" className="primary compact" onClick={submit}>{editing ? 'Resubmit application' : 'Submit application'}</button> : <button type="button" className="primary compact" onClick={goNext}>{step === 0 && !editing ? 'Create account & continue' : 'Save & continue ›'}</button>}</div>
      </div>
    </div>
  </section>;
}

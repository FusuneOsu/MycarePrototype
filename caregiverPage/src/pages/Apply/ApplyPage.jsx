import { useState } from 'react';
import { Brand } from '../../components/common.jsx';
import { TextField, SelectField, TextareaField, ChipGroup, ChoiceRow, FileSlot } from '../../components/fields.jsx';
import {
  APPLICATION_STEPS, blankApplication, centers, coverageAreaOptions, documentSlots, experienceBands,
  findResumableDraft, furthestStep, genders,
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

  /**
   * The furthest step visited so far — saved on the record so coming back
   * reopens where the applicant got to. It no longer gates anything: every step
   * can be opened from the stepper at any time, in any order. Submitting still
   * requires the whole form, so nothing incomplete gets filed.
   */
  const [reached, setReached] = useState(() => (editing ? APPLICATION_STEPS.length - 1 : furthestStep(resume)));

  /**
   * Whether the record exists yet. Step 0 creates it, so this has to be state
   * rather than derived from `resume`. Other steps can be viewed and filled
   * before it exists, but nothing is saved until there is an account to save
   * against — answers are held in the form meanwhile.
   */
  const [started, setStarted] = useState(() => editing || Boolean(resume));
  const unlockTo = (index) => setReached((prev) => Math.max(prev, index));

  /**
   * A saved draft matching the email just typed. Offered on step 1 so someone
   * coming back can pick their application up from the address alone — the
   * common case is a half-finished form on another device, where remembering a
   * password they set mid-wizard is exactly what they cannot do.
   */
  const [foundDraft, setFoundDraft] = useState(null);

  const set = (field) => (value) => setData((prev) => ({ ...prev, [field]: value }));

  // Only drafts are offered; a submitted application needs the password.
  const checkForDraft = (value) => {
    set('email')(value);
    if (editing || started) return;
    setFoundDraft(value.includes('@') ? findResumableDraft(value) : null);
  };

  const restoreDraft = () => {
    if (!foundDraft) return;
    setData({ ...blankApplication(), ...foundDraft.data });
    setPassword(foundDraft.password || '');
    setConfirm(foundDraft.password || '');
    setReached(Math.max(furthestStep(foundDraft), 1));
    setStarted(true);
    setStep(Math.min(foundDraft.step || 1, APPLICATION_STEPS.length - 1));
    setFoundDraft(null);
    setError('');
    onNotify('Welcome back — we restored your saved application.');
  };
  const setDocument = (id, file) => setData((prev) => ({ ...prev, documents: { ...prev.documents, [id]: file } }));
  const clearDocument = (id) => setData((prev) => { const next = { ...prev.documents }; delete next[id]; return { ...prev, documents: next }; });

  /**
   * Creates the account from Your details. Returns 'created', 'restored' (the
   * email already had a draft with this password, which has been merged back
   * in), or null with an error set. Needed before anything can be saved.
   */
  const createAccount = () => {
    if (!isStepComplete(0, data)) { setError('Please complete the required fields marked with * in Your details.'); return null; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return null; }
    if (password !== confirm) { setError('Both passwords must match.'); return null; }
    const existing = getApplication(data.email);
    if (existing && existing.password !== password) { setError('An application already exists for this email. Sign in to continue it.'); return null; }
    const saved = startApplication({ fullName: data.fullName, email: data.email, password });
    setStarted(true);
    if (existing) {
      // Someone re-entering the wizard with credentials they already used: pick their draft back up.
      const merged = { ...blankApplication(), ...saved.data, ...data };
      const furthest = Math.max(furthestStep(saved), reached, 1);
      saveApplication(data.email, { step: furthest, data: merged });
      setData(merged);
      setReached(furthest);
      onNotify('Welcome back — we restored your saved application.');
      return 'restored';
    }
    saveApplication(data.email, { step: Math.max(reached, 1), data });
    onNotify('Draft saved. You can leave and come back at any time.');
    return 'created';
  };

  const goNext = () => {
    setError('');
    // Only the account-creating button on Your details checks anything; every
    // other step may be left part-filled and returned to — the submit check
    // catches what is still missing, and the stepper flags it meanwhile.
    if (step === 0 && editing) {
      if (!isStepComplete(0, data)) { setError('Please complete the required fields marked with *.'); return; }
      saveApplication(data.email, { data });
      unlockTo(1);
      setStep(1);
      return;
    }

    if (step === 0 && !started) {
      if (!createAccount()) return;
      unlockTo(1);
      setStep(1);
      return;
    }

    saveStep(step + 1);
    unlockTo(step + 1);
    setStep(step + 1);
  };

  /**
   * Persists progress. `step` on the record is the furthest step unlocked, not
   * the one being viewed, so coming back reopens everything already seen.
   */
  const saveStep = (next) => {
    if (!data.email || !started) return;
    const furthest = Math.max(reached, next ?? step);
    saveApplication(data.email, editing ? { data } : { step: furthest, data });
  };

  const goBack = () => { setError(''); if (step === 0) { onCancel(); return; } saveStep(); setStep(step - 1); };

  const submit = () => {
    setError('');
    if (!isApplicationComplete(data)) {
      // Steps can be filled out of order now, so name the ones still missing
      // something rather than leaving the applicant to hunt for it.
      const missing = [0, 1, 2].filter((index) => !isStepComplete(index, data)).map((index) => APPLICATION_STEPS[index]);
      setError(`Still to finish: ${missing.join(', ')}. Select a step on the left to complete it.`);
      return;
    }
    if (!declared) { setError('Please confirm the declaration before submitting.'); return; }
    if (!started) {
      // Filled in out of order without creating the account first: do it now.
      // A restored draft is merged into the form, so let them look it over first.
      if (createAccount() !== 'created') return;
    }
    saveApplication(data.email, { data });
    submitApplication(data.email);
    onSubmitted({ role: 'caregiver', email: data.email, name: data.fullName });
  };

  const saveAndExit = () => {
    if (!started) {
      // Nothing is saved until the account exists — leaving now discards the form.
      onNotify('Create your account on this step to save your progress.');
      onCancel();
      return;
    }
    saveStep();
    onNotify(editing ? 'Your changes are saved. Resubmit when you are ready.' : `Draft saved. Come back with ${data.email} to pick up where you left off.`);
    onCancel();
  };

  /**
   * Every step is reachable directly, complete or not, from the very start —
   * applicants can open any section to see what it asks for and fill the form
   * in whatever order suits them.
   */
  const jumpTo = (index) => {
    if (index === step) return;
    setError('');
    saveStep(index);
    unlockTo(index);
    setStep(index);
  };

  const bodies = [
    <div className="apply-fields" key="details">
      {editing && resume?.reviewNote && <div className="status-note status-note--warn apply-returned"><strong>Reason from your coordinator</strong><p>{resume.reviewNote}</p></div>}
      <p className="apply-lead">{editing ? 'Update anything that needs fixing — you can jump straight to any step on the left.' : 'Just the essentials for now.'}{editing ? '' : ' Creating your account here lets you save your progress and track the review — you will fill in the rest of your profile once you are approved.'}</p>
      <TextField label="Full name (as per IC or passport)" value={data.fullName} onChange={set('fullName')} placeholder="Your full name" required />
      <div className="apply-row"><TextField label="Email address" type="email" value={data.email} onChange={checkForDraft} placeholder="you@example.com" required disabled={editing} /><TextField label="Phone number" value={data.phone} onChange={set('phone')} placeholder="+60 12-345 6789" required /></div>
      {foundDraft && <div className="status-note apply-resume">
        <strong>You already have an application in progress</strong>
        <p>We saved a draft for {data.email} on {new Date(foundDraft.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. Continue it rather than starting again.</p>
        <button type="button" className="primary compact" onClick={restoreDraft}>Continue my application</button>
      </div>}
      <div className="apply-row"><ChoiceRow label="Gender" value={data.gender} onChange={set('gender')} options={genders} required /><TextField label="IC or passport number" value={data.idNumber} onChange={set('idNumber')} placeholder="940608-14-5522" required /></div>
      {!editing && <>
        <div className="apply-row">
          <TextField label="Create password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" required />
          <TextField label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="Re-enter password" required />
        </div>
        <p className="apply-note">Already started? Enter the same email above to pick your draft back up, or <button type="button" className="link-button" onClick={onResume}>sign in to continue your application</button>.</p>
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
      {!isApplicationComplete(data) && <div className="status-note status-note--warn">
        <strong>Not ready to submit yet</strong>
        <p>These steps still need something: {[0, 1, 2].filter((index) => !isStepComplete(index, data)).map((index) => APPLICATION_STEPS[index]).join(', ')}. Select one on the left to finish it{started ? ' — everything you have entered is saved' : ''}.</p>
      </div>}
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
      <ol className="apply-steps apply-steps--jump">{APPLICATION_STEPS.map((label, index) => {
        const isReview = index === APPLICATION_STEPS.length - 1;
        const done = !isReview && isStepComplete(index, data);
        const visited = index <= reached;
        const classes = [index === step && 'on', done && 'done', index !== step && 'apply-step--open'].filter(Boolean).join(' ');
        return <li key={label} className={classes} onClick={() => jumpTo(index)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); jumpTo(index); } }} tabIndex={0} role="button" aria-current={index === step ? 'step' : undefined}>
          <i>{done ? '✓' : index + 1}</i>
          <span>{label}</span>
          {visited && index !== step && !done && !isReview && <em className="apply-step__hint">Incomplete</em>}
        </li>;
      })}</ol>
      <div className="apply-card panel">
        <div className="apply-head"><p className="eyebrow">Step {step + 1} of {APPLICATION_STEPS.length}</p><h2>{APPLICATION_STEPS[step]}</h2></div>
        {bodies[step]}
        {!started && step > 0 && <p className="apply-note">Not saved yet — fill in <button type="button" className="link-button" onClick={() => jumpTo(0)}>Your details</button> and create your account to save your progress.</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="apply-actions"><button type="button" className="back" onClick={goBack}>{step === 0 ? 'Cancel' : '‹ Back'}</button>{isLast ? <button type="button" className="primary compact" onClick={submit}>{editing ? 'Resubmit application' : 'Submit application'}</button> : <button type="button" className="primary compact" onClick={goNext}>{step === 0 && !started ? 'Create account & continue' : started ? 'Save & continue ›' : 'Continue ›'}</button>}</div>
      </div>
    </div>
  </section>;
}

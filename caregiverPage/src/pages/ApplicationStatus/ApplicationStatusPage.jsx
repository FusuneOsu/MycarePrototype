import { Brand } from '../../components/common.jsx';
import { documentSlots, STATUS, STATUS_TIMELINE } from '../../data/applicationData.js';

const COPY = {
  [STATUS.submitted]: ['Application received', 'Thank you. Your application is in the queue and a coordinator will pick it up shortly.'],
  [STATUS.review]: ['Under review', 'We are verifying your certificates with the issuing bodies. This usually takes 3 working days.'],
  [STATUS.moreInfo]: ['Not approved yet', 'Your coordinator could not approve your application as it stands. Update it using the reason below, then resubmit.'],
  [STATUS.approved]: ['You are approved', 'Welcome to the team. Your caregiver workspace is ready.'],
  [STATUS.rejected]: ['Application not successful', 'We are not able to move forward this time. You are welcome to apply again in six months.'],
};

export default function ApplicationStatusPage({ application, onLogout, onRefresh, onEdit }) {
  const [title, message] = COPY[application.status] || COPY[STATUS.submitted];
  const reached = application.status === STATUS.moreInfo ? 0 : STATUS_TIMELINE.indexOf(application.status);
  const { data } = application;

  return <section className="status-page">
    <header className="apply-top"><Brand /><div className="status-top-actions"><button type="button" className="back" onClick={onRefresh}>Check for updates</button><button type="button" className="back" onClick={onLogout}>Log out</button></div></header>
    <div className="status-shell">
      <div className="status-card panel">
        <p className="eyebrow">{application.id} · submitted {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
        <h1>{title}</h1>
        <p className="status-message">{message}</p>

        <ol className="status-track">{STATUS_TIMELINE.map((stage, index) => <li key={stage} className={index <= reached ? 'done' : ''}><i>{index <= reached ? '✓' : index + 1}</i><span>{stage}</span></li>)}</ol>

        {application.status === STATUS.moreInfo && <div className="status-note status-note--warn">
          <strong>Reason from your coordinator</strong>
          <p>{application.reviewNote || 'Please review your application and resubmit.'}</p>
          <button type="button" className="primary compact status-edit" onClick={onEdit}>Edit &amp; resubmit application</button>
        </div>}
        {application.status === STATUS.submitted && application.resubmittedAt && <div className="status-note"><strong>Resubmitted</strong><p>Thanks for the update. Your coordinator will review your application again.</p></div>}
        {application.status === STATUS.rejected && <div className="status-note status-note--warn"><strong>Outcome</strong><p>{application.reviewNote || 'Your application did not meet the current requirements.'}</p></div>}

        <h3 className="status-subhead">What you submitted</h3>
        <div className="review-grid">
          <div className="review-row"><span>Applying as</span><strong>Caregiver · {data.experienceBand || '—'}</strong></div>
          <div className="review-row"><span>Contact</span><strong>{data.email} · {data.phone || '—'}</strong></div>
          <div className="review-row"><span>Center</span><strong>{data.preferredCenter || '—'}</strong></div>
          <div className="review-row"><span>Specialisations</span><strong>{data.specialisations.join(', ') || '—'}</strong></div>
          <div className="review-row"><span>Availability</span><strong>{data.workingDays.join(', ') || '—'} · {data.shift || '—'}</strong></div>
          {documentSlots.map((slot) => <div className="review-row" key={slot.id}><span>{slot.label}</span><strong>{data.documents[slot.id]?.name || 'Not uploaded'}</strong></div>)}
        </div>
        <p className="apply-note">Once you are approved you will be asked to complete the rest of your profile — home address, date of birth and an emergency contact.</p>
      </div>
    </div>
  </section>;
}

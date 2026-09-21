import { useState } from 'react';
import { Avatar } from '../../components/common.jsx';
import { dismissChangeRequest, fieldLabel } from '../../data/profileChanges.js';
import { formatRating } from '../../../../shared/bookingHistory.js';

const show = (value) => (Array.isArray(value) ? value.join(', ') : value) || '—';
const date = (value) => {
  if (!value || value === '—') return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function Row({ label, value, pending }) {
  return <div className="detail-row"><span>{label}</span><strong>{show(value)}{pending !== undefined && <em className="pending-value">→ {show(pending)}</em>}</strong></div>;
}

function Block({ title, rows, pendingChanges, note }) {
  return <div className="detail-block">
    <h3>{title}{note && <span className="block-note">{note}</span>}</h3>
    {rows.map(([label, value, id]) => <Row key={label} label={label} value={value} pending={id && pendingChanges?.[id] !== undefined ? pendingChanges[id] : undefined} />)}
  </div>;
}

// Which editable fields live on which tab — used to flag tabs with pending
// edits or missing details.
const TABS = [
  { id: 'personal', label: 'Personal information', fields: ['phone', 'address', 'city', 'postcode', 'state', 'dob', 'nationality', 'emergencyName', 'emergencyRelationship', 'emergencyPhone'] },
  { id: 'experience', label: 'Experience & certificates', fields: ['specialisations', 'languages', 'bio'] },
  { id: 'availability', label: 'Availability', fields: ['coverageAreas', 'workingDays', 'shift', 'travelMode', 'workAccommodations'] },
  { id: 'bookings', label: 'Bookings & ratings', fields: [] },
];

export default function ProfilePage({ profile, onEdit, onRefresh, onNotify }) {
  const [tab, setTab] = useState('personal');
  const pending = profile.pendingChanges;
  const changedFields = pending ? Object.keys(pending) : [];
  const summary = profile.bookingSummary || { completed: 0, rated: 0, averageRating: null };

  const withdraw = () => { dismissChangeRequest(profile.email); onNotify('Change request withdrawn'); onRefresh(); };
  const flagged = (fields) => fields.some((field) => changedFields.includes(field) || profile.missingFields.includes(field));

  return <section className="page-card panel">
    <div className="page-intro">
      <div><p className="eyebrow">{profile.caregiverId} · joined {date(profile.joinedOn)}</p><h2>My profile</h2><p>Everything My CareGivers holds about you. Edits are reviewed by your coordinator before they go live.</p></div>
      <button className="primary compact" onClick={onEdit}>Edit profile</button>
    </div>

    {profile.missingFields.length > 0 && !pending && <div className="banner">
      <strong>Finish setting up your profile</strong>
      <p>Your application is approved. Please add your {profile.missingFields.map(fieldLabel).join(', ').toLowerCase()} so your coordinator can complete your file.</p>
      <button type="button" className="link-button" onClick={onEdit}>Add these details ›</button>
    </div>}

    {pending && <div className="banner banner--pending">
      <strong>{changedFields.length} change{changedFields.length === 1 ? '' : 's'} awaiting approval</strong>
      <p>{changedFields.map(fieldLabel).join(', ')} — submitted {date(profile.pendingRequest.submittedAt)}. Your coordinator reviews these in the admin workspace. New values are shown in green. <button type="button" className="link-button" onClick={withdraw}>Withdraw</button> · <button type="button" className="link-button" onClick={onRefresh}>Check for updates</button></p>
    </div>}

    <div className="profile-hero">
      <Avatar initials={profile.initials} />
      <div className="profile-hero-copy">
        <strong>{profile.name}</strong>
        <small>{profile.role} · {profile.center || 'No center assigned'} · {formatRating(summary)} · {summary.completed} completed</small>
        <p>{(pending?.bio ?? profile.bio) || 'No introduction added yet.'}</p>
      </div>
      <div className="profile-hero-pills">
        <span className={profile.accountStatus === 'Active' ? 'pill pill--on' : 'pill pill--warn'}>{profile.accountStatus}</span>
        <span className={profile.availability === 'Available' ? 'pill pill--on' : 'pill'}>{profile.availability}</span>
      </div>
    </div>

    <div className="profile-tabs" role="tablist">
      {TABS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'profile-tab profile-tab--on' : 'profile-tab'} onClick={() => setTab(item.id)}>
        {item.label}{flagged(item.fields) && <i className="profile-tab-dot" aria-label="needs attention" />}
      </button>)}
    </div>

    <div className="profile-panel" role="tabpanel">
      {tab === 'personal' && <div className="detail-grid">
        <Block title="Contact" pendingChanges={pending} rows={[['Email', profile.email], ['Phone', profile.phone, 'phone'], ['Home address', profile.address, 'address'], ['City', profile.city, 'city'], ['Postcode', profile.postcode, 'postcode'], ['State', profile.state, 'state']]} />
        <Block title="Personal details" pendingChanges={pending} rows={[['Full name', profile.name], ['Gender', profile.gender], ['IC / passport', profile.idNumber], ['Date of birth', profile.dob, 'dob'], ['Nationality', profile.nationality, 'nationality']]} />
        <Block title="Emergency contact" pendingChanges={pending} rows={[['Name', profile.emergencyName, 'emergencyName'], ['Relationship', profile.emergencyRelationship, 'emergencyRelationship'], ['Phone', profile.emergencyPhone, 'emergencyPhone']]} />
        <Block title="Account" note="Set by admin" rows={[['Status', profile.accountStatus], ['Availability', profile.availability], ['Booking pool', profile.accountStatus === 'Active' ? 'Visible to coordinators' : 'Not offered to patients'], ['Caregiver ID', profile.caregiverId], ['Username', profile.username], ['Center', profile.center], ['Auto-assigned', profile.autoAssigned], ['Manager', profile.managerName ? `${profile.managerName} · ${profile.managerId}` : 'Not assigned yet']]} />
      </div>}

      {tab === 'experience' && <div className="detail-grid">
        <Block title="Experience" pendingChanges={pending} rows={[['Years of experience', profile.experienceBand], ['Previous employer', profile.previousEmployer]]} />
        <Block title="Skills" pendingChanges={pending} rows={[['Specialisations', profile.specialisations, 'specialisations'], ['Languages', profile.languages, 'languages']]} />
        <div className="detail-block detail-block--wide"><h3>Introduction</h3><p className="profile-copy">{profile.bio || 'No introduction added yet.'}</p>{pending?.bio !== undefined && <p className="profile-copy pending-value">→ {pending.bio}</p>}</div>
        <div className="detail-block detail-block--wide">
          <h3>Certificates &amp; documents<span className="block-note">Verified by admin</span></h3>
          {profile.documents.map((document) => <div className="doc-row" key={document.label}>
            <span className="doc-copy"><strong>{document.label}</strong><small>{document.file}{document.expiry !== '—' ? ` · expires ${document.expiry}` : ''}</small></span>
            <span className={document.status === 'Verified' ? 'pill pill--on' : document.status === 'Missing' ? 'pill pill--warn' : 'pill'}>{document.status}</span>
          </div>)}
        </div>
      </div>}

      {tab === 'availability' && <div className="detail-grid">
        <Block title="Where" pendingChanges={pending} rows={[['Center', profile.center], ['Coverage areas', profile.coverageAreas, 'coverageAreas'], ['Travel mode', profile.travelMode, 'travelMode']]} />
        <Block title="When" pendingChanges={pending} rows={[['Working days', profile.workingDays, 'workingDays'], ['Shift / hours', profile.shift, 'shift'], ['Started on', date(profile.startDate)]]} />
        <Block title="Planning notes" pendingChanges={pending} rows={[['Work accommodations', profile.workAccommodations, 'workAccommodations']]} />
      </div>}

      {tab === 'bookings' && <div>
        <div className="profile-stats">
          <div><strong>{summary.completed}</strong><span>Completed bookings</span></div>
          <div><strong>{summary.averageRating === null ? '—' : summary.averageRating.toFixed(1)}</strong><span>Average rating{summary.rated ? ` from ${summary.rated} patient${summary.rated === 1 ? '' : 's'}` : ''}</span></div>
        </div>
        <div className="detail-block">
          <h3>Completed bookings</h3>
          {profile.bookings.length === 0 && <p className="profile-copy">No completed bookings yet. They appear here after each visit.</p>}
          {profile.bookings.map((booking) => <div className="booking-row" key={booking.id}>
            <span className="doc-copy"><strong>{booking.patient}</strong><small>{booking.service} · {date(booking.date)} · {booking.duration}</small>{booking.feedback && <em>“{booking.feedback}”</em>}</span>
            <span className="stars">{typeof booking.rating === 'number' ? '★'.repeat(booking.rating) + '☆'.repeat(5 - booking.rating) : 'Awaiting rating'}</span>
          </div>)}
        </div>
      </div>}

    </div>
  </section>;
}

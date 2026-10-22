import { useState } from 'react';
import StatusPill from '../caregivers/StatusPill/StatusPill.jsx';
import { Row } from '../../utils/patientRequestUtils.jsx';
import {
  REQUEST_STATUS, endTimeOf, formatDate, formatDuration, navigationLinks, setRequestStatus, editPatientRequest
} from '../../../../shared/bookingStore.js';
import { Button, Card, Field, Input, SectionHeader, Select, Textarea } from '../../../../shared/ui/index.js';

/**
 * Request detail card — every Module 1 intake field, plus review / reject actions.
 *
 * Props:
 *   request   — request object from bookingStore
 *   onChanged — callback after any mutation (status change, edit)
 */
export default function RequestCard({ request, onChanged }) {
  const [rejecting, setRejecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState('');
  const [editForm, setEditForm] = useState({
    patientName: request.patientName,
    phone: request.phone,
    careType: request.careType,
    preferredGender: request.preferredGender,
    area: request.area,
    address: request.address,
  });
  const links = navigationLinks(request);
  const open = request.status === REQUEST_STATUS.new || request.status === REQUEST_STATUS.review;

  const handleEditSubmit = () => {
    editPatientRequest(request.id, editForm);
    setEditing(false);
    onChanged();
  };

  return (
    <Card padded className="request-card">
      <SectionHeader
        eyebrow={`${request.source} request · ${request.id}`}
        title={request.patientName}
        actions={<StatusPill status={request.status} />}
      />

      {!editing ? (
        <>
          <div className="request-grid">
            <Row label="Contact number">{request.phone}</Row>
            <Row label="Care type needed">{request.careType}</Row>
            <Row label="Preferred date">{formatDate(request.preferredDate)}</Row>
            <Row label="Preferred time">
              {request.preferredStart}–{endTimeOf(request.preferredStart, request.durationMins)} ({formatDuration(request.durationMins)})
            </Row>
            <Row label="Preferred caregiver gender">{request.preferredGender}</Row>
            <Row label="Zone">{request.area}</Row>
            <div className="request-row request-row--full">
              <span>Address</span>
              <strong>
                {request.address}{' '}
                <a className="request-map-link" href={links.google} target="_blank" rel="noreferrer">View map ↗</a>
              </strong>
            </div>
          </div>
          <div className="request-note"><span>Special notes</span><p>{request.notes || 'None'}</p></div>
          {request.statusReason && (
            <div className="request-reason">
              <strong>{request.status === REQUEST_STATUS.rejected ? 'Rejected' : 'Note'}:</strong> {request.statusReason}
            </div>
          )}

          {open && (
            <div className="request-actions">
              <Button size="sm" onClick={() => setEditing(true)}>Edit request</Button>
              {request.status === REQUEST_STATUS.new && (
                <Button size="sm" onClick={() => { setRequestStatus(request.id, REQUEST_STATUS.review); onChanged(); }}>
                  Mark as in review
                </Button>
              )}
              {!rejecting && (
                <Button variant="danger" size="sm" onClick={() => setRejecting(true)}>Reject request</Button>
              )}
            </div>
          )}
          {open && rejecting && (
            <div className="request-reject">
              <Textarea
                rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for rejecting (sent to the patient)" aria-label="Reason for rejecting"
              />
              <div className="request-actions">
                <Button size="sm" onClick={() => setRejecting(false)}>Cancel</Button>
                <Button variant="danger" size="sm" disabled={!reason.trim()}
                  onClick={() => { setRequestStatus(request.id, REQUEST_STATUS.rejected, reason.trim()); onChanged(); }}>
                  Confirm rejection
                </Button>
              </div>
            </div>
          )}
          {request.status === REQUEST_STATUS.rejected && (
            <div className="request-actions">
              <Button size="sm" onClick={() => { setRequestStatus(request.id, REQUEST_STATUS.review, ''); onChanged(); }}>
                Reopen request
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="request-edit-form">
          <Field label="Patient Name">
            <Input value={editForm.patientName} onChange={(e) => setEditForm((p) => ({ ...p, patientName: e.target.value }))} />
          </Field>
          <Field label="Contact Number">
            <Input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
          </Field>
          <Field label="Care Type Needed">
            <Input value={editForm.careType} onChange={(e) => setEditForm((p) => ({ ...p, careType: e.target.value }))} />
          </Field>
          <Field label="Zone (Area)">
            <Input value={editForm.area} onChange={(e) => setEditForm((p) => ({ ...p, area: e.target.value }))} />
          </Field>
          <Field label="Address">
            <Textarea rows={2} value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
          </Field>
          <Field label="Preferred Caregiver Gender">
            <Select value={editForm.preferredGender} onChange={(e) => setEditForm((p) => ({ ...p, preferredGender: e.target.value }))}>
              <option value="No preference">Up to Admin (No preference)</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
          </Field>
          <div className="request-actions" style={{ marginTop: '16px' }}>
            <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleEditSubmit}>Save changes</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
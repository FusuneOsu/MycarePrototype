import Modal from '../common/Modal/Modal.jsx';
import { Button } from '../../../../shared/ui/index.js';
import './BranchDeleteDialog.css';

export default function BranchDeleteDialog({ branch, busy = false, onConfirm, onClose }) {
  return (
    <Modal isOpen={Boolean(branch)} onClose={busy ? () => {} : onClose} title="Delete branch" size="sm">
      <div className="branch-delete-dialog">
        <p>Delete <strong>{branch?.name}</strong>? Caregivers will become Unassigned.</p>
        <div className="branch-delete-dialog__actions">
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete branch'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

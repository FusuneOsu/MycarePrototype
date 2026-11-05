import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../../shared/ui/index.js';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import BranchOverviewCard from '../../components/branches/BranchOverviewCard.jsx';
import BranchMap from '../../components/branches/BranchMap.jsx';
import BranchDeleteDialog from '../../components/branches/BranchDeleteDialog.jsx';
import BranchToast from '../../components/branches/BranchToast.jsx';
import LinkedAppointmentsToast from '../../components/branches/LinkedAppointmentsToast.jsx';
import { deleteBranch, fetchBranch } from '../../api/branches.js';
import './BranchDetailPage.css';

export default function BranchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(location.state?.toast || null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [blockers, setBlockers] = useState(null);

  useEffect(() => {
    let active = true;
    fetchBranch(id)
      .then((result) => { if (active) { setBranch(result); setError(''); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const confirmDelete = async () => {
    if (!branch) return;
    setDeleteBusy(true);
    setBlockers(null);
    try {
      await deleteBranch(branch.id);
      navigate('/branches', { state: { toast: { type: 'success', message: `${branch.name} was deleted.` } } });
    } catch (err) {
      setDeleteOpen(false);
      if (err.status === 409 && err.payload?.blockingAppointments) setBlockers(err.payload);
      else setToast({ type: 'error', message: err.message });
    } finally {
      setDeleteBusy(false);
    }
  };

  if (loading || (branch && branch.id !== id)) return <div className="branch-detail-page"><Topbar title="Branch" /><p>Loading branch…</p></div>;
  if (error || !branch) {
    return (
      <div className="branch-detail-page">
        <Topbar title="Branch unavailable" />
        <BranchToast message={error || 'Branch not found.'} type="error" />
        <Button onClick={() => navigate('/branches')}>Back to branches</Button>
      </div>
    );
  }

  return (
    <div className="branch-detail-page">
      <Topbar
        title={branch.name}
        subtitle="Branch overview and location."
        actions={(
          <>
            <Button onClick={() => navigate(`/caregivers?branch_id=${encodeURIComponent(branch.id)}`)}>View Caregivers</Button>
            <Button onClick={() => navigate(`/appointments?branch_id=${encodeURIComponent(branch.id)}`)}>View Appointments</Button>
            <Button onClick={() => navigate(`/branches/${encodeURIComponent(branch.id)}/edit`)}>Edit</Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete</Button>
          </>
        )}
      />
      <div className="branch-detail-page__body">
        <BranchToast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />
        <LinkedAppointmentsToast response={blockers} onDismiss={() => setBlockers(null)} />
        <div className="branch-detail-page__grid">
          <BranchOverviewCard branch={branch} />
          <BranchMap latitude={branch.latitude} longitude={branch.longitude} />
        </div>
      </div>
      <BranchDeleteDialog
        branch={deleteOpen ? branch : null}
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}

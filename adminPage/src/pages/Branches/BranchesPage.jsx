import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import BranchSearchFilters from '../../components/branches/BranchSearchFilters.jsx';
import BranchTable from '../../components/branches/BranchTable.jsx';
import BranchDeleteDialog from '../../components/branches/BranchDeleteDialog.jsx';
import BranchToast from '../../components/branches/BranchToast.jsx';
import LinkedAppointmentsToast from '../../components/branches/LinkedAppointmentsToast.jsx';
import { deleteBranch, fetchBranches } from '../../api/branches.js';
import './BranchesPage.css';

export default function BranchesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(location.state?.toast || null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [blockers, setBlockers] = useState(null);

  const loadBranches = useCallback(() => {
    fetchBranches({ search, status })
      .then((rows) => { setBranches(rows); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setBlockers(null);
    setToast(null);
    try {
      await deleteBranch(deleteTarget.id);
      setDeleteTarget(null);
      setToast({ type: 'success', message: `${deleteTarget.name} was deleted.` });
      await loadBranches();
    } catch (err) {
      setDeleteTarget(null);
      if (err.status === 409 && err.payload?.blockingAppointments) setBlockers(err.payload);
      else setToast({ type: 'error', message: err.message });
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="branches-page">
      <Topbar title="Branches" subtitle="Manage care locations and the teams assigned to them." />
      <div className="branches-page__body">
        <BranchToast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />
        <LinkedAppointmentsToast response={blockers} onDismiss={() => setBlockers(null)} />
        {error && <BranchToast message={error} type="error" onDismiss={() => setError('')} />}
        <BranchSearchFilters
          search={search}
          status={status}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onAdd={() => navigate('/branches/new')}
        />
        {loading ? <p className="branches-page__loading">Loading branches…</p> : (
          <BranchTable
            branches={branches}
            onView={(branch) => navigate(`/branches/${encodeURIComponent(branch.id)}`)}
            onEdit={(branch) => navigate(`/branches/${encodeURIComponent(branch.id)}/edit`)}
            onDelete={setDeleteTarget}
          />
        )}
      </div>
      <BranchDeleteDialog
        branch={deleteTarget}
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

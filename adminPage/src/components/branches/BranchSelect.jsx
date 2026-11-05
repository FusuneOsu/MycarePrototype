import { useEffect, useState } from 'react';
import { fetchBranch, fetchBranches } from '../../api/branches.js';
import './BranchSelect.css';

function BranchSelect({
  value = '',
  onChange,
  label = 'Branch',
  includeUnassigned = false,
  selectedBranch = null,
  disabled = false,
}) {
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState('');
  const [fetchedBranch, setFetchedBranch] = useState(null);

  useEffect(() => {
    let active = true;
    fetchBranches({ status: 'active' })
      .then((rows) => { if (active) { setBranches(rows); setError(''); } })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!value || branches.some((branch) => branch.id === value) || selectedBranch?.id === value) return;
    let active = true;
    fetchBranch(value)
      .then((branch) => { if (active) setFetchedBranch(branch); })
      .catch(() => {});
    return () => { active = false; };
  }, [value, branches, selectedBranch]);

  const selectedInactiveBranch = selectedBranch?.id === value
    ? selectedBranch
    : fetchedBranch?.id === value ? fetchedBranch : null;
  const options = selectedInactiveBranch && !branches.some((branch) => branch.id === selectedInactiveBranch.id)
    ? [selectedInactiveBranch, ...branches]
    : branches;

  return (
    <div className="branch-select">
      <label className="branch-select__label">{label}</label>
      <select
        value={value || ''}
        disabled={disabled}
        onChange={(event) => {
          const branch = options.find((item) => item.id === event.target.value) || null;
          onChange?.(branch);
        }}
      >
        <option value="">{includeUnassigned ? 'Unassigned' : '— Select branch —'}</option>
        {options.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}{branch.service_area ? ` — ${branch.service_area}` : ''}{branch.status === 'inactive' ? ' (Inactive)' : ''}
          </option>
        ))}
      </select>
      {error && <span className="branch-select__error" role="alert">{error}</span>}
    </div>
  );
}

export default BranchSelect;

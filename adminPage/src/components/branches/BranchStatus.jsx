import './BranchStatus.css';

export default function BranchStatus({ status }) {
  const value = String(status || 'inactive').toLowerCase();
  return <span className={`branch-status branch-status--${value}`}>{value}</span>;
}

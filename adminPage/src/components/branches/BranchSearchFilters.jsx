import { Button, Input, Select, Toolbar } from '../../../../shared/ui/index.js';
import './BranchSearchFilters.css';

export default function BranchSearchFilters({ search, status, onSearchChange, onStatusChange, onAdd }) {
  return (
    <Toolbar className="branch-search-filters">
      <Input
        size="sm"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search branches by name"
        aria-label="Search branches by name"
      />
      <Select size="sm" value={status} onChange={(event) => onStatusChange(event.target.value)} aria-label="Filter branches by status">
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </Select>
      <Button variant="primary" size="sm" onClick={onAdd}>Add Branch</Button>
    </Toolbar>
  );
}

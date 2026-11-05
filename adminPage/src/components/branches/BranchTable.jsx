import { Button, Table } from '../../../../shared/ui/index.js';
import BranchStatus from './BranchStatus.jsx';
import './BranchTable.css';

const COLUMNS = ['Branch name', 'Service area', 'Address', 'Status', 'Capacity', 'Caregivers', 'Ongoing appointments', 'Actions'];

export default function BranchTable({ branches, onView, onEdit, onDelete }) {
  return (
    <Table columns={COLUMNS} raised label="Branches" empty={branches.length === 0 && 'No branches match your filters.'}>
      {branches.map((branch) => (
        <tr key={branch.id}>
          <td><strong>{branch.name}</strong></td>
          <td>{branch.service_area}</td>
          <td className="branch-table__address">{branch.address}</td>
          <td><BranchStatus status={branch.status} /></td>
          <td>{branch.capacity}</td>
          <td>{branch.caregiver_count}</td>
          <td>{branch.ongoing_appointment_count}</td>
          <td className="branch-table__actions">
            <Button size="sm" onClick={() => onView(branch)}>View</Button>
            <Button size="sm" onClick={() => onEdit(branch)}>Edit</Button>
            <Button size="sm" variant="danger" onClick={() => onDelete(branch)}>Delete</Button>
          </td>
        </tr>
      ))}
    </Table>
  );
}

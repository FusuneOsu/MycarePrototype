import './CaregiverTable.css';

const AVAILABILITY_OPTIONS = ['Available', 'On Duty', 'Off Duty', 'On Leave'];

function CaregiverTable({ caregivers, onSeeMore, onAvailabilityChange }) {
  if (caregivers.length === 0) {
    return (
      <div className="caregiver-table__empty">
        <p>No caregivers match your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="caregiver-table-wrap">
      <table className="caregiver-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Gender</th>
            <th>Center</th>
            <th>Availability</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {caregivers.map((caregiver) => (
            <tr key={caregiver.id}>
              <td className="caregiver-table__id">{caregiver.id}</td>
              <td>{caregiver.name}</td>
              <td>{caregiver.gender}</td>
              <td>{caregiver.center}</td>
              <td>
                <select
                  className="caregiver-table__availability"
                  value={caregiver.availability}
                  aria-label={`Availability for ${caregiver.name}`}
                  onChange={(event) =>
                    onAvailabilityChange(caregiver.id, event.target.value)
                  }
                >
                  {AVAILABILITY_OPTIONS.map((availability) => (
                    <option key={availability} value={availability}>
                      {availability}
                    </option>
                  ))}
                </select>
              </td>
              <td className="caregiver-table__actions">
                <button
                  type="button"
                  className="caregiver-table__see-more"
                  onClick={() => onSeeMore(caregiver)}
                >
                  See more
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CaregiverTable;

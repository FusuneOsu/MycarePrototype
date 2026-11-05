import './LinkedAppointmentsToast.css';

export default function LinkedAppointmentsToast({ response, onDismiss }) {
  if (!response) return null;
  const appointments = response.blockingAppointments || [];
  const otherCount = Math.max(0, Number(response.totalCount || 0) - Math.min(3, appointments.length));

  return (
    <div className="linked-appointments-toast" role="alert" aria-live="assertive">
      <div className="linked-appointments-toast__heading">
        <strong>This branch is in use</strong>
        <button type="button" onClick={onDismiss} aria-label="Dismiss message">×</button>
      </div>
      <p>Serve or reassign these appointments before deleting the branch.</p>
      <ul>
        {appointments.slice(0, 3).map((appointment) => (
          <li key={appointment.id}>
            <strong>{appointment.patient}</strong> · {appointment.date} · {appointment.id}
          </li>
        ))}
      </ul>
      {otherCount > 0 && <p className="linked-appointments-toast__others">+{otherCount} others</p>}
    </div>
  );
}

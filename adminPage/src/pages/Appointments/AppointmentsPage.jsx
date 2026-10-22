import { useCallback, useEffect, useMemo, useState } from 'react';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import MonthView from '../../components/appointments/MonthView.jsx';
import WeekView from '../../components/appointments/WeekView.jsx';
import DayView from '../../components/appointments/DayView.jsx';
import EditAppointmentModal from '../../components/appointments/EditAppointmentModal.jsx';
import { Input, Segmented, Select, StatCard, StatGrid, Toolbar } from '../../../../shared/ui/index.js';
import { fetchAppointments, updateAppointment } from '../../api/appointments.js';
import { toISODate, toApiFormat, normalizeAppointment, formatDateLabel, STATUS_OPTIONS } from '../../utils/appointmentUtils.js';
import './AppointmentsPage.css';

function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [selectedView, setSelectedView] = useState('week');
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));
  const [caregiverFilter, setCaregiverFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadAppointments = useCallback(() => {
    fetchAppointments()
      .then((data) => setAppointments(data.map(normalizeAppointment)))
      .catch((err) => { console.error('Failed:', err); setAppointments([]); });
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const mc = !caregiverFilter || a.caregiverName.toLowerCase().includes(caregiverFilter.toLowerCase()) || (a.caregiverId || '').toLowerCase().includes(caregiverFilter.toLowerCase());
      const mp = !patientFilter || a.patientName.toLowerCase().includes(patientFilter.toLowerCase()) || (a.patientId || '').toLowerCase().includes(patientFilter.toLowerCase());
      return mc && mp && (statusFilter === 'All' || a.status === statusFilter) && (typeFilter === 'All' || a.appointmentType === typeFilter);
    });
  }, [appointments, caregiverFilter, patientFilter, statusFilter, typeFilter]);

  const selectedDayAppointments = useMemo(
    () => filteredAppointments.filter((a) => a.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [filteredAppointments, selectedDate]
  );

  const selectedDateSummary = useMemo(
    () => ({ upcoming: filteredAppointments.filter((a) => a.date >= selectedDate).length }),
    [filteredAppointments, selectedDate]
  );

  const handleSaveAppointment = async (formData) => {
    await updateAppointment(formData.id, toApiFormat(formData));
    loadAppointments();
  };

  const handleViewDay = (date) => {
    setSelectedDate(date);
    setSelectedView('day');
  };

  return (
    <div className="appointments-page">
      <Topbar title="Appointments" subtitle="Schedule, track and resolve care visits across the week." />

      <div className="appointments-page__content">
        <Toolbar className="appointments-page__toolbar">
          <Segmented label="Change calendar view" value={selectedView} onChange={setSelectedView}
            options={[{ id: 'month', label: 'Month' }, { id: 'week', label: 'Week' }, { id: 'day', label: 'Day' }]} />
          <Input size="sm" type="text" value={caregiverFilter}
            onChange={(e) => setCaregiverFilter(e.target.value)}
            placeholder="Filter by caregiver name / ID" aria-label="Filter by caregiver" />
          <Input size="sm" type="text" value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            placeholder="Filter by patient name / ID" aria-label="Filter by patient" />
          <Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="All">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select size="sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type">
            <option value="All">All appointment types</option>
            <option value="Home Visit">Home Visit</option>
            <option value="Care Center">Care Center</option>
          </Select>
        </Toolbar>

        <StatGrid>
          <StatCard label="Selected date" value={formatDateLabel(selectedDate)} note="Click a day to change it" icon={'\u25a3'} />
          <StatCard label="Appointments" value={selectedDayAppointments.length}
            note={selectedDateSummary.upcoming + ' upcoming from this date'} icon={'\u25f7'} />
        </StatGrid>

        {selectedView === 'month' && (
          <MonthView
            appointments={filteredAppointments}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onViewDay={handleViewDay}
          />
        )}

        {selectedView === 'week' && (
          <WeekView
            appointments={filteredAppointments}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onViewDay={handleViewDay}
          />
        )}

        {selectedView === 'day' && (
          <DayView
            appointments={selectedDayAppointments}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onAppointmentClick={(appt) => { setEditingAppointment(appt); setIsEditModalOpen(true); }}
          />
        )}
      </div>

      <EditAppointmentModal
        isOpen={isEditModalOpen}
        appointment={editingAppointment}
        onClose={() => { setIsEditModalOpen(false); setEditingAppointment(null); }}
        onSave={handleSaveAppointment}
      />
    </div>
  );
}

export default AppointmentsPage;

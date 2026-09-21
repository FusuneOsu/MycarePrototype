import { useMemo, useState } from 'react';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import { Card, CellStack, Select, StatCard, StatGrid, Table } from '../../../../shared/ui/index.js';
import { listBookableCaregivers } from '../../data/caregiverAccounts.js';
import { mockBedInventory, mockDischargeBreakdown, mockPtoRequests, mockTrendSeries } from '../../data/mockDashboard.js';
import './DashboardPage.css';

const STATUS_COLORS = {
  available: 'var(--ui-green)',
  unavailable: 'var(--ui-line)',
};

const APPOINTMENT_STATUS_ORDER = ['Scheduled', 'Completed', 'In progress', 'Cancelled', 'Missed'];

function DashboardPage() {
  const [selectedLocation, setSelectedLocation] = useState('All locations');
  const [selectedDateRange, setSelectedDateRange] = useState('This week');

  const caregiverSummary = useMemo(() => {
    // Active caregivers — includes approved applicants, excludes suspended ones.
    const caregivers = listBookableCaregivers();
    const map = {
      Available: 0,
      'On Duty': 0,
      'Off Duty': 0,
      'On Leave': 0,
    };

    caregivers.forEach((caregiver) => {
      if (map[caregiver.availability] !== undefined) {
        map[caregiver.availability] += 1;
      }
    });

    const available = map.Available;
    const unavailable = caregivers.length - available;
    return {
      total: caregivers.length,
      available,
      unavailable,
      availablePercent: Math.round((available / caregivers.length) * 100),
      unavailablePercent: Math.round((unavailable / caregivers.length) * 100),
      breakdown: [
        { label: 'Available', value: available, color: STATUS_COLORS.available },
        { label: 'Not available', value: unavailable, color: STATUS_COLORS.unavailable },
      ],
    };
  }, []);

  const filteredBeds = useMemo(() => {
    if (selectedLocation === 'All locations') return mockBedInventory;
    return mockBedInventory.filter((record) => record.location === selectedLocation);
  }, [selectedLocation]);

  const patientMetrics = useMemo(() => {
    const appointmentStatusTotals = {
      'Caregiver assigned': 8,
      Scheduled: 11,
      'In progress': 4,
      Cancelled: 3,
      Missed: 2,
      Completed: 7,
      'No caregiver assigned': 2,
    };

    const total = Object.values(appointmentStatusTotals).reduce((sum, value) => sum + value, 0);
    const distribution = APPOINTMENT_STATUS_ORDER.map((status) => ({
      status,
      value: appointmentStatusTotals[status] || 0,
      percent: Math.round(((appointmentStatusTotals[status] || 0) / total) * 100),
    }));

    const discharged = 42;
    const active = 58;

    return { distribution, discharged, active };
  }, []);

  const ptoSummary = useMemo(() => {
    const approved = mockPtoRequests.filter((item) => item.status === 'Approved').length;
    const pending = mockPtoRequests.filter((item) => item.status === 'Pending').length;
    return { approved, pending, total: mockPtoRequests.length };
  }, []);

  const maxTrendValue = useMemo(
    () => Math.max(...mockTrendSeries.flatMap((item) => [item.appointments, item.patients])),
    []
  );

  const locations = ['All locations', ...mockBedInventory.map((item) => item.location)];

  return (
    <div className="dashboard-page">
      <Topbar
        title="Dashboard"
        subtitle="Operational overview across care teams and patient activity."
        actions={(
          <>
            <Select size="sm" value={selectedLocation} onChange={(event) => setSelectedLocation(event.target.value)} aria-label="Location">
              {locations.map((location) => <option key={location} value={location}>{location}</option>)}
            </Select>
            <Select size="sm" value={selectedDateRange} onChange={(event) => setSelectedDateRange(event.target.value)} aria-label="Date range">
              <option value="Today">Today</option>
              <option value="This week">This week</option>
              <option value="This month">This month</option>
            </Select>
          </>
        )}
      />

      <div className="dashboard-page__content">
        <StatGrid>
          <StatCard label="Available caregivers" value={caregiverSummary.available} note={`${caregiverSummary.availablePercent}% of the active team`} icon="✓" />
          <StatCard label="Not available" value={caregiverSummary.unavailable} note={`${caregiverSummary.unavailablePercent}% on duty, off duty or on leave`} icon="◷" tone="warn" />
          <StatCard label="Beds available" value={filteredBeds.reduce((sum, item) => sum + item.available, 0)} note={`Across ${filteredBeds.length} location(s)`} icon="▣" />
          <StatCard label="PTO requests" value={ptoSummary.total} note={`${ptoSummary.approved} approved · ${ptoSummary.pending} pending`} icon="◫" tone="gold" />
        </StatGrid>

        <div className="dashboard-page__grid">
          <Card title="Caregiver availability" className="dashboard-page__wide">
            <div className="dashboard-page__availability-wrap">
              <div className="dashboard-page__donut-chart" aria-label="Caregiver availability chart">
                <svg viewBox="0 0 120 120" role="img">
                  <circle cx="60" cy="60" r="38" fill="none" strokeWidth="18" style={{ stroke: 'var(--ui-neutral-soft)' }} />
                  <circle
                    cx="60"
                    cy="60"
                    r="38"
                    fill="none"
                    strokeWidth="18"
                    strokeDasharray={`${caregiverSummary.availablePercent * 2.39} 239`}
                    transform="rotate(-90 60 60)"
                    strokeLinecap="round"
                    style={{ stroke: 'var(--ui-green)' }}
                  />
                </svg>
                <div className="dashboard-page__donut-label">
                  <strong>{caregiverSummary.availablePercent}%</strong>
                  <span>Available</span>
                </div>
              </div>

              <div className="dashboard-page__legend">
                {caregiverSummary.breakdown.map((item) => (
                  <div key={item.label} className="dashboard-page__legend-item">
                    <span className="dashboard-page__legend-dot" style={{ background: item.color }} />
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Appointment status">
            <div className="dashboard-page__bar-list">
              {patientMetrics.distribution.map((item) => (
                <div key={item.status} className="dashboard-page__bar-row">
                  <div className="dashboard-page__bar-labels">
                    <span>{item.status}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="dashboard-page__bar-track">
                    <span style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Discharge mix">
            <div className="dashboard-page__ring-wrap">
              {mockDischargeBreakdown.map((segment) => (
                <div key={segment.label} className="dashboard-page__ring-item">
                  <div className="dashboard-page__mini-donut" style={{ background: `conic-gradient(${segment.color} 0 ${segment.value}%, var(--ui-neutral-soft) ${segment.value}% 100%)` }}>
                    <span>{segment.value}%</span>
                  </div>
                  <small>{segment.label}</small>
                </div>
              ))}
            </div>
          </Card>

          <Card title="In-house beds by location" className="dashboard-page__wide">
            <Table columns={['Location', 'Available', 'Occupied', 'Occupancy']} label="Beds by location">
              {filteredBeds.map((bed) => (
                <tr key={bed.location}>
                  <td><CellStack primary={bed.location} /></td>
                  <td>{bed.available}</td>
                  <td>{bed.occupied}</td>
                  <td>{bed.occupancyRate}%</td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card
            title="Patient and appointment trend"
            className="dashboard-page__wide"
            action={(
              <div className="dashboard-page__trend-legend">
                <span className="dashboard-page__key dashboard-page__key--patients">Patients</span>
                <span className="dashboard-page__key dashboard-page__key--appointments">Appointments</span>
              </div>
            )}
          >
            <div className="dashboard-page__trend-chart" aria-label="Patient and appointment trend chart">
              {mockTrendSeries.map((point) => (
                <div key={point.label} className="dashboard-page__trend-day">
                  <div className="dashboard-page__trend-bars">
                    <span
                      className="dashboard-page__trend-bar dashboard-page__trend-bar--patients"
                      style={{ height: `${(point.patients / maxTrendValue) * 100}%` }}
                      title={`${point.patients} patients`}
                    />
                    <span
                      className="dashboard-page__trend-bar dashboard-page__trend-bar--appointments"
                      style={{ height: `${(point.appointments / maxTrendValue) * 100}%` }}
                      title={`${point.appointments} appointments`}
                    />
                  </div>
                  <span className="dashboard-page__trend-label">{point.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="PTO requests" className="dashboard-page__wide">
            <Table columns={['Caregiver', 'Dates', 'Days', 'Status']} label="PTO requests">
              {mockPtoRequests.map((request) => (
                <tr key={`${request.caregiver}-${request.dates}`}>
                  <td><CellStack primary={request.caregiver} /></td>
                  <td className="ui-table__muted">{request.dates}</td>
                  <td>{request.days} day(s)</td>
                  <td><StatusPill status={request.status} /></td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;

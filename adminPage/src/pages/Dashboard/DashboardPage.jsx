import { useMemo, useState } from 'react';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import { mockCaregivers } from '../../data/mockCaregivers.js';
import { mockBedInventory, mockDischargeBreakdown, mockPtoRequests, mockTrendSeries } from '../../data/mockDashboard.js';
import './DashboardPage.css';

const STATUS_COLORS = {
  available: '#2F6F63',
  onDuty: '#C97A3D',
  offDuty: '#7C8C88',
  onLeave: '#B5484B',
};

const APPOINTMENT_STATUS_ORDER = ['Scheduled', 'Completed', 'In progress', 'Cancelled', 'Missed'];

function DashboardPage() {
  const [selectedLocation, setSelectedLocation] = useState('All locations');
  const [selectedDateRange, setSelectedDateRange] = useState('This week');

  const caregiverSummary = useMemo(() => {
    const map = {
      Available: 0,
      'On Duty': 0,
      'Off Duty': 0,
      'On Leave': 0,
    };

    mockCaregivers.forEach((caregiver) => {
      if (map[caregiver.availability] !== undefined) {
        map[caregiver.availability] += 1;
      }
    });

    const available = map.Available;
    const unavailable = mockCaregivers.length - available;
    return {
      total: mockCaregivers.length,
      available,
      unavailable,
      availablePercent: Math.round((available / mockCaregivers.length) * 100),
      unavailablePercent: Math.round((unavailable / mockCaregivers.length) * 100),
      breakdown: [
        { label: 'Available', value: available, color: STATUS_COLORS.available },
        { label: 'Not available', value: unavailable, color: '#DCE6E2' },
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
      <Topbar title="Dashboard" subtitle="Operational overview across care teams and patient activity." />

      <div className="dashboard-page__content">
        <div className="dashboard-page__toolbar">
          <div className="dashboard-page__filter-group">
            <label>
              Location
              <select value={selectedLocation} onChange={(event) => setSelectedLocation(event.target.value)}>
                {locations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </label>

            <label>
              Date range
              <select value={selectedDateRange} onChange={(event) => setSelectedDateRange(event.target.value)}>
                <option value="Today">Today</option>
                <option value="This week">This week</option>
                <option value="This month">This month</option>
              </select>
            </label>
          </div>
        </div>

        <div className="dashboard-page__metrics">
          <div className="dashboard-page__metric-card dashboard-page__metric-card--primary">
            <span className="dashboard-page__metric-label">Available caregivers</span>
            <strong>{caregiverSummary.available}</strong>
            <small>{caregiverSummary.availablePercent}% of team</small>
          </div>

          <div className="dashboard-page__metric-card dashboard-page__metric-card--accent">
            <span className="dashboard-page__metric-label">Not available</span>
            <strong>{caregiverSummary.unavailable}</strong>
            <small>{caregiverSummary.unavailablePercent}% of team</small>
          </div>

          <div className="dashboard-page__metric-card dashboard-page__metric-card--neutral">
            <span className="dashboard-page__metric-label">Beds available</span>
            <strong>{filteredBeds.reduce((sum, item) => sum + item.available, 0)}</strong>
            <small>Across {filteredBeds.length} location(s)</small>
          </div>

          <div className="dashboard-page__metric-card dashboard-page__metric-card--success">
            <span className="dashboard-page__metric-label">PTO requests</span>
            <strong>{ptoSummary.total}</strong>
            <small>{ptoSummary.approved} approved · {ptoSummary.pending} pending</small>
          </div>
        </div>

        <div className="dashboard-page__grid">
          <section className="dashboard-page__panel dashboard-page__panel--wide">
            <div className="dashboard-page__panel-header">
              <h3>Caregiver availability</h3>
            </div>

            <div className="dashboard-page__availability-wrap">
              <div className="dashboard-page__donut-chart" aria-label="Caregiver availability chart">
                <svg viewBox="0 0 120 120" role="img">
                  <circle cx="60" cy="60" r="38" fill="none" stroke="#E9EDEE" strokeWidth="18" />
                  <circle
                    cx="60"
                    cy="60"
                    r="38"
                    fill="none"
                    stroke="#2F6F63"
                    strokeWidth="18"
                    strokeDasharray={`${caregiverSummary.availablePercent * 2.39} 239`}
                    transform="rotate(-90 60 60)"
                    strokeLinecap="round"
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
          </section>

          <section className="dashboard-page__panel">
            <div className="dashboard-page__panel-header">
              <h3>Appointment status</h3>
            </div>

            <div className="dashboard-page__bar-list">
              {patientMetrics.distribution.map((item) => (
                <div key={item.status} className="dashboard-page__bar-row">
                  <div className="dashboard-page__bar-labels">
                    <span>{item.status}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="dashboard-page__bar-track">
                    <span style={{ width: `${item.percent}%`, background: '#2F6F63' }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-page__panel">
            <div className="dashboard-page__panel-header">
              <h3>Discharge mix</h3>
            </div>

            <div className="dashboard-page__ring-wrap">
              {mockDischargeBreakdown.map((segment) => (
                <div key={segment.label} className="dashboard-page__ring-item">
                  <div className="dashboard-page__mini-donut" style={{ background: `conic-gradient(${segment.color} 0 ${segment.value}%, #E9EDEE ${segment.value}% 100%)` }}>
                    <span>{segment.value}%</span>
                  </div>
                  <small>{segment.label}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-page__panel dashboard-page__panel--wide">
            <div className="dashboard-page__panel-header">
              <h3>In-house beds by location</h3>
            </div>

            <div className="dashboard-page__bed-table">
              <div className="dashboard-page__table-head">
                <span>Location</span>
                <span>Available</span>
                <span>Occupied</span>
                <span>Occupancy</span>
              </div>

              {filteredBeds.map((bed) => (
                <div key={bed.location} className="dashboard-page__table-row">
                  <span>{bed.location}</span>
                  <span>{bed.available}</span>
                  <span>{bed.occupied}</span>
                  <span>{bed.occupancyRate}%</span>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-page__panel dashboard-page__panel--wide">
            <div className="dashboard-page__panel-header">
              <h3>Patient and appointment trend</h3>
            </div>

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
                  <label>{point.label}</label>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-page__panel dashboard-page__panel--wide">
            <div className="dashboard-page__panel-header">
              <h3>PTO requests</h3>
            </div>

            <div className="dashboard-page__pto-list">
              {mockPtoRequests.map((request) => (
                <div key={`${request.caregiver}-${request.dates}`} className="dashboard-page__pto-item">
                  <div>
                    <strong>{request.caregiver}</strong>
                    <span>{request.dates}</span>
                  </div>
                  <div className="dashboard-page__pto-meta">
                    <span className={`dashboard-page__pto-status dashboard-page__pto-status--${request.status.toLowerCase()}`}>
                      {request.status}
                    </span>
                    <small>{request.days} day(s)</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;

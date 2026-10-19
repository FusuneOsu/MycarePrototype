import { useState } from 'react';
import { Card, Select } from '../../../../shared/ui/index.js';

const DONUT_COLORS = ['var(--ui-green)', 'var(--ui-amber)', 'var(--ui-line)'];
const DONUT_LABELS = ['Free', 'Assigned', 'Inactive'];

export default function CaregiverAvailabilityCard({ availabilityAgg, caregivers, onFilterChange }) {
  const [location, setLocation] = useState('');
  const [gender, setGender] = useState('');
  const [skill, setSkill] = useState('');

  if (!availabilityAgg) return null;

  const { total, free, assigned, inactive, freePercent, assignedPercent, inactivePercent } = availabilityAgg;
  const values = [free, assigned, inactive];
  const percents = [freePercent, assignedPercent, inactivePercent];

  // Build the donut stroke-dasharray
  const circumference = 2 * Math.PI * 60;
  const segments = [];
  let offset = 0;
  percents.forEach((pct, i) => {
    if (pct > 0) {
      const length = (pct / 100) * circumference;
      segments.push(
        <circle
          key={DONUT_LABELS[i]}
          cx="80" cy="80" r="60"
          fill="none"
          stroke={DONUT_COLORS[i]}
          strokeWidth="16"
          strokeDasharray={`${length} ${circumference - length}`}
          strokeDashoffset={-offset}
          transform="rotate(-90 80 80)"
        />
      );
      offset += length;
    }
  });

  const handleFilter = (key, value) => {
    const setters = { location: setLocation, gender: setGender, skill: setSkill };
    if (setters[key]) setters[key](value);
    if (onFilterChange) onFilterChange({ ...{ location, gender, skill }, [key]: value });
  };

  return (
    <Card title="Caregiver availability">
      <div className="dashboard-page__filters">
        <Select
          label="Location"
          options={['', 'Kuala Lumpur', 'Penang', 'Johor Bahru', 'Ipoh']}
          value={location}
          onChange={(e) => handleFilter('location', e.target.value)}
          placeholder="All locations"
        />
        <Select
          label="Gender"
          options={['', 'Female', 'Male']}
          value={gender}
          onChange={(e) => handleFilter('gender', e.target.value)}
          placeholder="All genders"
        />
        <Select
          label="Skill"
          options={['', 'Post-operative care', 'Elderly care', 'Childcare', 'Physiotherapy']}
          value={skill}
          onChange={(e) => handleFilter('skill', e.target.value)}
          placeholder="All skills"
        />
      </div>
      <div className="dashboard-page__availability-wrap">
        <div className="dashboard-page__donut-chart">
          <svg viewBox="0 0 160 160" aria-label="Caregiver availability donut chart">
            {segments}
          </svg>
          <div className="dashboard-page__donut-label">
            <strong>{total}</strong>
            <span>Total</span>
          </div>
        </div>
        <div className="dashboard-page__legend">
          {DONUT_LABELS.map((label, i) => (
            <div key={label} className="dashboard-page__legend-item">
              <span className="dashboard-page__legend-dot" style={{ background: DONUT_COLORS[i] }} />
              <span>{label}</span>
              <span>{values[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

import { useMemo, useState } from 'react';
import { Card, Field, Select } from '../../../../shared/ui/index.js';

const DONUT_COLORS = ['#a1d99b', '#31a354', '#e5f5e0'];
const DONUT_LABELS = ['Free', 'Assigned', 'Inactive'];

export default function CaregiverAvailabilityCard({ availabilityAgg, caregivers, onFilterChange }) {
  const [location, setLocation] = useState('');
  const [gender, setGender] = useState('');
  const [skill, setSkill] = useState('');

  // Derive filter options dynamically from the actual caregiver data
  const locationOptions = useMemo(() => {
    const set = new Set((caregivers || []).map((c) => c.center).filter(Boolean));
    return ['', ...set].sort();
  }, [caregivers]);

  const genderOptions = useMemo(() => {
    const set = new Set((caregivers || []).map((c) => c.gender).filter(Boolean));
    return ['', ...set].sort();
  }, [caregivers]);

  const skillOptions = useMemo(() => {
    const set = new Set();
    (caregivers || []).forEach((c) => {
      (c.skills || []).forEach((s) => s && set.add(s));
    });
    return ['', ...set].sort();
  }, [caregivers]);

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

  // When no segments (total=0), show a full gray ring so the chart keeps its shape
  if (segments.length === 0) {
    segments.push(
      <circle key="empty" cx="80" cy="80" r="60" fill="none" stroke="var(--ui-line)" strokeWidth="16" />
    );
  }

  const handleFilter = (key, value) => {
    const setters = { location: setLocation, gender: setGender, skill: setSkill };
    if (setters[key]) setters[key](value);
    if (onFilterChange) onFilterChange({ ...{ location, gender, skill }, [key]: value });
  };

  return (
    <Card title="Caregiver availability">
      <div className="dashboard-page__filters">
        <Field label="Location">
          <Select
            size="sm"
            value={location}
            onChange={(e) => handleFilter('location', e.target.value)}
          >
            <option value="">All locations</option>
            {locationOptions.filter(Boolean).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </Select>
        </Field>
        <Field label="Gender">
          <Select
            size="sm"
            value={gender}
            onChange={(e) => handleFilter('gender', e.target.value)}
          >
            <option value="">All genders</option>
            {genderOptions.filter(Boolean).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </Select>
        </Field>
        <Field label="Skill">
          <Select
            size="sm"
            value={skill}
            onChange={(e) => handleFilter('skill', e.target.value)}
          >
            <option value="">All skills</option>
            {skillOptions.filter(Boolean).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </Select>
        </Field>
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

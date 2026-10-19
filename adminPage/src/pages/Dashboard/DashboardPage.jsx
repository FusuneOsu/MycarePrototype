import { useEffect, useMemo, useState } from 'react';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import { Card, Select } from '../../../../shared/ui/index.js';
import { useLanguage } from '../../../../shared/i18n/LanguageContext.jsx';
import { listBookableCaregivers } from '../../data/caregiverAccounts.js';
import { listApplications } from '../../../../shared/caregiverStore.js';
import { listRequests } from '../../../../shared/bookingStore.js';
import {
  aggregateBookings,
  aggregateRevenue,
  aggregateCaregiverAvailability,
  aggregateOnboarding,
  buildTrendSeries,
} from '../../utils/dashboardUtils.js';
import BookingsOverviewCard from '../../components/dashboard/BookingsOverviewCard.jsx';
import RevenueOverviewCard from '../../components/dashboard/RevenueOverviewCard.jsx';
import CaregiverAvailabilityCard from '../../components/dashboard/CaregiverAvailabilityCard.jsx';
import OnboardingPipelineCard from '../../components/dashboard/OnboardingPipelineCard.jsx';
import TrendChart from '../../components/dashboard/TrendChart.jsx';
import ExportButton from '../../components/dashboard/ExportButton.jsx';
import './DashboardPage.css';

const RANGE_OPTIONS = ['Today', 'This week', 'This month', 'All time'];

function DashboardPage() {
  const { t } = useLanguage();
  const [selectedDateRange, setSelectedDateRange] = useState('This week');
  const [caregiverFilters, setCaregiverFilters] = useState({});
  const [bookings, setBookings] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const role = new URLSearchParams(window.location.search).get('role') || 'admin';
  const isManagement = role === 'management';

  // --- Data fetching: Cloudflare D1 -> API fallback -> localStorage ---
  useEffect(() => {
    let cancelled = false;

    const loadFromApi = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setBookings(data.bookings || []);
            setCaregivers(data.caregivers || []);
            setLoading(false);
          }
          return true;
        }
      } catch {
        // fall through
      }

      // Fallback 1: /api/bookings + /api/caregivers (Vite proxy)
      try {
        const [bRes, cRes] = await Promise.all([
          fetch('/api/bookings'),
          fetch('/api/caregivers'),
        ]);
        if (bRes.ok && cRes.ok) {
          const bData = await bRes.json();
          const cData = await cRes.json();
          if (!cancelled) {
            setBookings(bData);
            setCaregivers(cData);
            setLoading(false);
          }
          return true;
        }
      } catch {
        // fall through
      }

      // Fallback 2: localStorage stores (standalone dev)
      if (!cancelled) {
        setBookings([]);
        setCaregivers(listBookableCaregivers());
        setLoading(false);
      }
      return false;
    };

    loadFromApi();
    return () => { cancelled = true; };
  }, []);

  // --- Derived data via pure aggregation functions ---
  const bookingsAgg = useMemo(() => aggregateBookings(bookings, selectedDateRange), [bookings, selectedDateRange]);
  const revenueAgg = useMemo(() => aggregateRevenue(bookings, selectedDateRange), [bookings, selectedDateRange]);
  const availabilityAgg = useMemo(() => aggregateCaregiverAvailability(caregivers, caregiverFilters), [caregivers, caregiverFilters]);
  const onboardingAgg = useMemo(() => {
    const applications = listApplications();
    const requests = listRequests();
    return aggregateOnboarding(applications, requests);
  }, []);
  const bookingTrend = useMemo(() => buildTrendSeries(bookings, 7), [bookings]);
  const revenueTrend = useMemo(() => buildTrendSeries(bookings, 7), [bookings]);

  const exportData = useMemo(() => ({
    bookings,
    caregivers,
    applications: listApplications(),
    requests: listRequests(),
  }), [bookings, caregivers]);

  if (loading) {
    return (
      <div className="dashboard-page">
        <Topbar title={t('nav.dashboard')} />
        <div className="dashboard-page__loading">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Topbar
        title={t('nav.dashboard')}
        actions={(
          <>
            {isManagement && (
              <span className="dashboard-page__role-badge">Read-only</span>
            )}
            <Select
              size="sm"
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              aria-label="Date range"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </Select>
          </>
        )}
      />

      <ExportButton role={role} data={exportData} range={selectedDateRange} disabled={!bookings.length && !caregivers.length} />

      <div className="dashboard-page__grid">
        <BookingsOverviewCard bookingsAgg={bookingsAgg} />
        <RevenueOverviewCard revenueAgg={revenueAgg} />
        <CaregiverAvailabilityCard
          availabilityAgg={availabilityAgg}
          caregivers={caregivers}
          onFilterChange={setCaregiverFilters}
        />
        <OnboardingPipelineCard onboardingAgg={onboardingAgg} />
        <TrendChart
          title="Booking trend (7 days)"
          series={bookingTrend}
          metric="bookings"
          color="var(--ui-green)"
        />
        <TrendChart
          title="Revenue trend (7 days)"
          series={revenueTrend}
          metric="revenue"
          color="var(--ui-blue)"
        />
      </div>
    </div>
  );
}

export default DashboardPage;

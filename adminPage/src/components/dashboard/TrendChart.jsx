import { Card } from '../../../../shared/ui/index.js';

/**
 * Reusable bar chart for bookings & revenue trends.
 * Props:
 *   title    — card title
 *   series   — array of { date, label, total, paid, unpaid }
 *   metric   — 'bookings' or 'revenue'
 *   color    — primary bar color
 */
export default function TrendChart({ title, series = [], metric = 'bookings', color = 'var(--ui-green)' }) {
  if (!series.length) return null;

  const maxValue = Math.max(...series.map((p) => (metric === 'revenue' ? p.paid : p.total)), 1);

  return (
    <Card title={title} className="dashboard-page__wide">
      <div className="dashboard-page__trend-chart" aria-label={`${title} trend chart`}>
        {series.map((point) => {
          const value = metric === 'revenue' ? point.paid : point.total;
          const pct = Math.min((value / maxValue) * 100, 100);
          const formattedValue =
            metric === 'revenue' ? `RM ${(value / 100).toFixed(0)}` : String(value);

          return (
            <div key={point.date} className="dashboard-page__trend-day">
              <div className="dashboard-page__trend-bars">
                <span
                  className="dashboard-page__trend-bar"
                  style={{ height: `${pct}%`, background: color }}
                  title={formattedValue}
                />
              </div>
              <span className="dashboard-page__trend-label">{point.label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

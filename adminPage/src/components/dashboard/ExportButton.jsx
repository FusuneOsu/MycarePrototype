import { Button } from '../../../../shared/ui/index.js';
import { logAudit } from '../../../../shared/auditStore.js';
import { downloadText, toCsv } from '../../utils/download.js';
import { buildExportCsv } from '../../utils/dashboardUtils.js';

/**
 * Export button for dashboard reports.
 * Props:
 *   role        — 'admin' or 'management' (management hides export)
 *   data        — { bookings, caregivers, applications, requests }
 *   range       — current date range label
 *   disabled    — optional flag
 */
export default function ExportButton({ role = 'admin', data, range, disabled }) {
  if (role === 'management') return null;

  const handleExportCsv = () => {
    const csvRows = buildExportCsv(data, range);
    const csv = toCsv(csvRows);
    downloadText(`dashboard-${range.replace(/\s+/g, '-')}.csv`, csv);
    logAudit('Exported dashboard CSV', { range });
  };

  return (
    <div className="dashboard-page__export-bar">
      <Button onClick={handleExportCsv} disabled={disabled}>
        Export CSV
      </Button>
    </div>
  );
}

import { Card, StatCard } from '../../../../shared/ui/index.js';

export default function OnboardingPipelineCard({ onboardingAgg }) {
  if (!onboardingAgg) return null;

  const { pendingApplications, whatsappRequests, websiteRequests } = onboardingAgg;
  const totalRequests = whatsappRequests + websiteRequests;
  const whatsappPct = totalRequests ? Math.round((whatsappRequests / totalRequests) * 100) : 0;
  const websitePct = totalRequests ? Math.round((websiteRequests / totalRequests) * 100) : 0;

  return (
    <Card title="Onboarding pipeline">
      <div className="dashboard-page__stat-row">
        <StatCard label="Pending applications" value={pendingApplications} />
      </div>
      <h4 className="dashboard-page__subtitle">Request sources</h4>
      <div className="dashboard-page__bar-list">
        <div>
          <div className="dashboard-page__bar-labels">
            <span>WhatsApp</span>
            <span>{whatsappRequests} ({whatsappPct}%)</span>
          </div>
          <div className="dashboard-page__bar-track">
            <span style={{ width: `${whatsappPct}%`, background: 'var(--ui-green)' }} />
          </div>
        </div>
        <div>
          <div className="dashboard-page__bar-labels">
            <span>Website</span>
            <span>{websiteRequests} ({websitePct}%)</span>
          </div>
          <div className="dashboard-page__bar-track">
            <span style={{ width: `${websitePct}%`, background: 'var(--ui-blue)' }} />
          </div>
        </div>
      </div>
    </Card>
  );
}

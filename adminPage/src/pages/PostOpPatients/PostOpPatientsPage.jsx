import Topbar from '../../components/common/Topbar/Topbar.jsx';
import { Card, SectionHeader } from '../../../../shared/ui/index.js';

function PostOpPatientsPage() {
  return (
    <div className="placeholder-page">
      <Topbar title="Post-Op Patients" subtitle="Track patients in post-operative care." />
      <Card padded>
        <SectionHeader eyebrow="Coming soon" title="Post-operative care" intro="Recovery tracking, discharge plans and follow-up visits will live here." />
        <div className="ui-table-empty">No post-op patients to show yet.</div>
      </Card>
    </div>
  );
}

export default PostOpPatientsPage;

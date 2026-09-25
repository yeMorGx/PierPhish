import { AuthGuard } from "@/components/auth/auth-guard";
import { CampaignWorkspaceContent } from "@/components/campaigns/campaign-workspace-content";

export default function NewCampaignPage() {
  return (
    <AuthGuard>
      <CampaignWorkspaceContent view="new" />
    </AuthGuard>
  );
}

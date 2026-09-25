import { AuthGuard } from "@/components/auth/auth-guard";
import { CampaignWorkspaceContent } from "@/components/campaigns/campaign-workspace-content";

export default function CampaignGroupsPage() {
  return (
    <AuthGuard>
      <CampaignWorkspaceContent view="groups" />
    </AuthGuard>
  );
}

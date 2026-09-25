import { AuthGuard } from "@/components/auth/auth-guard";
import { CampaignWorkspaceContent } from "@/components/campaigns/campaign-workspace-content";

export default function CampaignActivityPage() {
  return (
    <AuthGuard>
      <CampaignWorkspaceContent view="activity" />
    </AuthGuard>
  );
}

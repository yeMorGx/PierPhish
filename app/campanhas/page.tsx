import { AuthGuard } from "@/components/auth/auth-guard";
import { CampaignWorkspaceContent } from "@/components/campaigns/campaign-workspace-content";

export default function CampaignsPage() {
  return (
    <AuthGuard>
      <CampaignWorkspaceContent view="campaigns" />
    </AuthGuard>
  );
}

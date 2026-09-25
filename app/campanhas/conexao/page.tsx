import { AuthGuard } from "@/components/auth/auth-guard";
import { CampaignWorkspaceContent } from "@/components/campaigns/campaign-workspace-content";

export default function CampaignConnectionPage() {
  return (
    <AuthGuard>
      <CampaignWorkspaceContent view="connection" />
    </AuthGuard>
  );
}

import { AuthGuard } from "@/components/auth/auth-guard";
import { CampaignOverviewContent } from "@/components/campaigns/campaign-overview-content";

export default function CampaignOverviewPage() {
  return (
    <AuthGuard>
      <CampaignOverviewContent />
    </AuthGuard>
  );
}

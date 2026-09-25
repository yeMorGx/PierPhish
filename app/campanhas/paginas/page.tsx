import { AuthGuard } from "@/components/auth/auth-guard";
import { CampaignAssetsContent } from "@/components/campaigns/campaign-assets-content";

export default function CampaignPagesPage() {
  return (
    <AuthGuard>
      <CampaignAssetsContent section="pages" />
    </AuthGuard>
  );
}

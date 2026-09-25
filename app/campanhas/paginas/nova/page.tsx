import { AuthGuard } from "@/components/auth/auth-guard";
import { CampaignAssetCreateContent } from "@/components/campaigns/campaign-asset-create-content";

export default function NewCampaignLandingPage() {
  return (
    <AuthGuard>
      <CampaignAssetCreateContent type="page" />
    </AuthGuard>
  );
}

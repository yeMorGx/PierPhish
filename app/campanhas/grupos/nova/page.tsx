import { AuthGuard } from "@/components/auth/auth-guard";
import { CampaignAssetCreateContent } from "@/components/campaigns/campaign-asset-create-content";

export default function NewCampaignGroupPage() {
  return (
    <AuthGuard>
      <CampaignAssetCreateContent type="group" />
    </AuthGuard>
  );
}

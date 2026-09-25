import { AuthGuard } from "@/components/auth/auth-guard";
import { CampaignAssetCreateContent } from "@/components/campaigns/campaign-asset-create-content";

export default function NewCampaignSendingProfilePage() {
  return (
    <AuthGuard>
      <CampaignAssetCreateContent type="sending_profile" />
    </AuthGuard>
  );
}

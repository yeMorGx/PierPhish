import { AuthGuard } from "@/components/auth/auth-guard";
import { CampaignAssetCreateContent } from "@/components/campaigns/campaign-asset-create-content";

export default function NewCampaignTemplatePage() {
  return (
    <AuthGuard>
      <CampaignAssetCreateContent type="template" />
    </AuthGuard>
  );
}

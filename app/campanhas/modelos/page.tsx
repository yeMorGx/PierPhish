import { AuthGuard } from "@/components/auth/auth-guard";
import { CampaignAssetsContent } from "@/components/campaigns/campaign-assets-content";

export default function CampaignTemplatesPage() {
  return (
    <AuthGuard>
      <CampaignAssetsContent section="templates" />
    </AuthGuard>
  );
}

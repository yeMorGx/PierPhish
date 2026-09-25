import { AuthGuard } from "@/components/auth/auth-guard";
import { CampaignAssetsContent } from "@/components/campaigns/campaign-assets-content";

export default function CampaignSendingProfilesPage() {
  return (
    <AuthGuard>
      <CampaignAssetsContent section="sendingProfiles" />
    </AuthGuard>
  );
}

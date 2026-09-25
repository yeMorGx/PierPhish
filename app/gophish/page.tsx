import { AuthGuard } from "@/components/auth/auth-guard";
import { GophishPageContent } from "@/components/gophish/gophish-page-content";

export default function GophishPage() {
  return (
    <AuthGuard>
      <GophishPageContent />
    </AuthGuard>
  );
}

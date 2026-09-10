import { AuthGuard } from "@/components/auth/auth-guard";
import { StatusContent } from "@/components/status/status-content";

export default function StatusPage() {
  return (
    <AuthGuard>
      <StatusContent />
    </AuthGuard>
  );
}

import { AuthGuard } from "@/components/auth/auth-guard";
import { AuditContent } from "@/components/audit/audit-content";
export default function AuditPage() {
  return (
    <AuthGuard>
      <AuditContent />
    </AuthGuard>
  );
}

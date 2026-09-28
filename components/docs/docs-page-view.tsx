import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DocsContent } from "@/components/docs/docs-content";
import type { DocsTopic } from "@/components/docs/docs-content";

export function DocsPageView({ topic }: { topic: DocsTopic }) {
  return (
    <AuthGuard>
      <DashboardShell activeSection="docs" title="Documentação">
        <DocsContent topic={topic} />
      </DashboardShell>
    </AuthGuard>
  );
}

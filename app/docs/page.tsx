import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DocsContent } from "@/components/docs/docs-content";

export const metadata: Metadata = {
  title: "Documentação | PierSec",
  description:
    "Guia passo a passo para usar painéis, campanhas, riscos e administração no PierSec.",
};

export default function DocsPage() {
  return (
    <AuthGuard>
      <DashboardShell activeSection="docs" title="Documentação">
        <DocsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

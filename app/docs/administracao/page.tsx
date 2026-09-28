import type { Metadata } from "next";
import { DocsPageView } from "@/components/docs/docs-page-view";

export const metadata: Metadata = {
  title: "Administração | Documentação | PierSec",
  description:
    "Gerencie pessoas, empresas, workspaces e preferências no PierSec.",
};

export default function AdministrationDocsPage() {
  return <DocsPageView topic="administracao" />;
}

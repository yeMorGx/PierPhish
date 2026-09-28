import type { Metadata } from "next";
import { DocsPageView } from "@/components/docs/docs-page-view";

export const metadata: Metadata = {
  title: "Ajuda | Documentação | PierSec",
  description: "Resolva problemas comuns ao consultar e operar o PierSec.",
};

export default function HelpDocsPage() {
  return <DocsPageView topic="ajuda" />;
}

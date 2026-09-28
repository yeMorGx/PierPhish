import type { Metadata } from "next";
import { DocsPageView } from "@/components/docs/docs-page-view";

export const metadata: Metadata = {
  title: "Resultados | Documentação | PierSec",
  description: "Entenda os resultados, os eventos e o histórico de campanhas.",
};

export default function ResultsDocsPage() {
  return <DocsPageView topic="resultados" />;
}

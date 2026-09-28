import type { Metadata } from "next";
import { DocsPageView } from "@/components/docs/docs-page-view";

export const metadata: Metadata = {
  title: "Primeiros passos | Documentação | PierSec",
  description: "Acesse o PierSec, escolha um workspace e leia o painel.",
};

export default function FirstStepsDocsPage() {
  return <DocsPageView topic="primeiros-passos" />;
}

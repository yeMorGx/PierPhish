import type { Metadata } from "next";
import { DocsPageView } from "@/components/docs/docs-page-view";

export const metadata: Metadata = {
  title: "Guia do produto | PierSec",
  description: "Guias por assunto para usar o PierSec.",
};

export default function DocsPage() {
  return <DocsPageView topic="inicio" />;
}

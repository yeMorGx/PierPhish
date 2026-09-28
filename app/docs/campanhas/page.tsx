import type { Metadata } from "next";
import { DocsPageView } from "@/components/docs/docs-page-view";

export const metadata: Metadata = {
  title: "Campanhas | Documentação | PierSec",
  description: "Prepare, revise e confirme uma campanha pelo PierSec.",
};

export default function CampaignDocsPage() {
  return <DocsPageView topic="campanhas" />;
}

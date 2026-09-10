"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { PresentationContent } from "@/components/presentation/presentation-content";

export default function PresentationPage() {
  return (
    <AuthGuard>
      <PresentationContent />
    </AuthGuard>
  );
}

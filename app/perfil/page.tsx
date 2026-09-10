"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProfileContent } from "@/components/profile/profile-content";

function ProfilePageContent() {
  return (
    <DashboardShell activeSection="profile" title="Perfil">
      <ProfileContent />
    </DashboardShell>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfilePageContent />
    </AuthGuard>
  );
}

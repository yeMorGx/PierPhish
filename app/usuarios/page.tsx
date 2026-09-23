import { Suspense } from "react";
import { UserManagementPage } from "@/components/users/user-management-content";

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UserManagementPage />
    </Suspense>
  );
}

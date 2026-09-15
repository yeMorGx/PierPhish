export type WorkspaceEnvironment = "test" | "production";

export type WorkspaceRecord = {
  id: string;
  name: string;
  environment: WorkspaceEnvironment;
  description: string;
  logoUrl: string | null;
  createdAt: string;
};

export type CompanyRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  clientId: string;
  clientSecretLast4: string;
  hasClientSecret: boolean;
  logoUrl: string | null;
  status: "active" | "inactive";
  createdAt: string;
};

export const localWorkspacesKey = "pierphish-workspaces";
export const localCompaniesKey = "pierphish-companies";
export const activeWorkspaceKey = "pierphish-active-workspace";

export const demoWorkspaces: WorkspaceRecord[] = [
  {
    id: "primary",
    name: "Workspace principal",
    environment: "production",
    description: "Operação oficial do PierPhish",
    logoUrl: null,
    createdAt: "2026-09-01T12:00:00.000Z",
  },
];

export const demoCompanies: CompanyRecord[] = [
  {
    id: "demo-piersec",
    workspaceId: "primary",
    name: "PierSec",
    description: "Ambiente principal de conscientização",
    clientId: "piersec-production",
    clientSecretLast4: "7A4Q",
    hasClientSecret: true,
    logoUrl: null,
    status: "active",
    createdAt: "2026-09-02T10:00:00.000Z",
  },
];

function readList<T>(key: string, fallback: T[]) {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  if (!stored) return fallback;
  try {
    const parsed = JSON.parse(stored) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

export function readLocalWorkspaces() {
  return readList<WorkspaceRecord>(localWorkspacesKey, demoWorkspaces);
}

export function readLocalCompanies() {
  return readList<CompanyRecord>(localCompaniesKey, demoCompanies);
}

export function writeLocalWorkspaces(workspaces: WorkspaceRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localWorkspacesKey, JSON.stringify(workspaces));
  window.dispatchEvent(new Event("pierphish:workspaces-changed"));
}

export function readActiveWorkspaceId() {
  if (typeof window === "undefined") return demoWorkspaces[0].id;
  return (
    window.localStorage.getItem(activeWorkspaceKey) ?? demoWorkspaces[0].id
  );
}

export function writeActiveWorkspaceId(workspaceId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(activeWorkspaceKey, workspaceId);
  window.dispatchEvent(new Event("pierphish:workspace-selected"));
}

export function writeLocalCompanies(companies: CompanyRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localCompaniesKey, JSON.stringify(companies));
}

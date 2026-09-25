import { NextRequest, NextResponse } from "next/server";
import {
  databaseWorkspaceId,
  gophishError,
  isWorkspaceId,
  requireGophishWorkspaceAccess,
} from "@/lib/server-gophish";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!isWorkspaceId(workspaceId)) {
    return gophishError("Workspace inválido.", 400);
  }
  const access = await requireGophishWorkspaceAccess(request, workspaceId);
  if (access.error) return access.error;

  const { data, error } = await access.client
    .from("pierphish_gophish_connectors")
    .select("id,name,snapshot,last_seen,created_at")
    .eq("workspace_id", databaseWorkspaceId(workspaceId))
    .order("created_at", { ascending: true });
  if (error) return gophishError("Não foi possível carregar o conector.", 502);

  const now = Date.now();
  return NextResponse.json(
    {
      connectors: (data ?? []).map((connector) => ({
        id: connector.id,
        name: connector.name,
        snapshot: connector.snapshot,
        lastSeen: connector.last_seen,
        createdAt: connector.created_at,
        online:
          Boolean(connector.last_seen) &&
          now - new Date(connector.last_seen).getTime() < 90_000,
      })),
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        Vary: "Authorization",
      },
    },
  );
}

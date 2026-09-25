import { NextRequest, NextResponse } from "next/server";
import { GET as getConnections } from "@/app/api/gophish/route";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const response = await getConnections(request);
  if (!response.ok) return response;
  const body = (await response.json()) as {
    connectors?: Array<{ name?: string }>;
  };
  const connectors = (body.connectors ?? []).map((connector) => ({
    ...connector,
    name: /gophish|gophishing/i.test(connector.name ?? "")
      ? "Conexão de campanhas"
      : connector.name,
  }));
  return NextResponse.json(
    { ...body, connectors },
    { status: response.status, headers: response.headers },
  );
}

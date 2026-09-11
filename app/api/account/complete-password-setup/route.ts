import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "A administração da sessão não foi configurada no servidor." },
      { status: 503 },
    );
  }

  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return NextResponse.json(
      { error: "Sessão não encontrada." },
      { status: 401 },
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json(
      { error: "Sua sessão não é válida." },
      { status: 401 },
    );
  }

  const appMetadata = (data.user.app_metadata ?? {}) as Record<string, unknown>;
  const { error: updateError } = await client.auth.admin.updateUserById(
    data.user.id,
    {
      app_metadata: {
        ...appMetadata,
        password_rotation_required: false,
      },
    },
  );

  if (updateError) {
    return NextResponse.json(
      {
        error:
          "A senha foi atualizada, mas não foi possível concluir o acesso.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

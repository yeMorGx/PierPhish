import { NextRequest, NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type AdminMetadata = {
  role?: unknown;
  is_admin?: unknown;
};

type CreateUserPayload = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function requireAdmin(request: NextRequest) {
  const client = getAdminClient();
  if (!client) {
    return {
      client: null,
      error: responseError(
        "A administração de usuários ainda não foi configurada no servidor.",
        503,
      ),
    };
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return {
      client: null,
      error: responseError("Sessão não encontrada.", 401),
    };
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return {
      client: null,
      error: responseError("Sua sessão não é válida.", 401),
    };
  }

  const metadata = (data.user.app_metadata ?? {}) as AdminMetadata;
  const role = typeof metadata.role === "string" ? metadata.role : "";
  const isAdmin =
    metadata.is_admin === true || role === "admin" || role === "owner";

  if (!isAdmin) {
    return {
      client: null,
      error: responseError(
        "Você não tem permissão para administrar usuários.",
        403,
      ),
    };
  }

  return { client, error: null };
}

function safeUser(user: User) {
  const metadata = user.user_metadata as
    | { display_name?: unknown; name?: unknown }
    | undefined;
  const displayName =
    typeof metadata?.display_name === "string"
      ? metadata.display_name
      : typeof metadata?.name === "string"
        ? metadata.name
        : "";

  return {
    id: user.id,
    email: user.email ?? "",
    name: displayName,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at,
    emailConfirmed: Boolean(user.email_confirmed_at),
    passwordRotationRequired:
      (user.app_metadata as { password_rotation_required?: unknown } | null)
        ?.password_rotation_required === true,
  };
}

function validatePassword(password: string, email: string) {
  if (password.length < 12) return "A senha inicial precisa ter 12 caracteres.";

  const groups = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d]/].filter((pattern) =>
    pattern.test(password),
  ).length;
  if (groups < 3) {
    return "Use pelo menos 3 grupos: maiúsculas, minúsculas, números ou símbolos.";
  }

  const normalizedPassword = password.toLowerCase();
  const normalizedEmail = email.toLowerCase().split("@")[0];
  const commonPasswords = ["password", "senha", "pierphish", "be phish"];
  if (
    commonPasswords.some((value) => normalizedPassword.includes(value)) ||
    (normalizedEmail.length >= 4 &&
      normalizedPassword.includes(normalizedEmail))
  ) {
    return "Evite senhas previsíveis ou relacionadas ao usuário e ao produto.";
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { client, error } = await requireAdmin(request);
  if (error || !client) return error;

  const { data, error: listError } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  if (listError)
    return responseError("Não foi possível carregar os usuários.", 502);

  return NextResponse.json({ users: data.users.map(safeUser) });
}

export async function POST(request: NextRequest) {
  const { client, error } = await requireAdmin(request);
  if (error || !client) return error;

  let payload: CreateUserPayload;
  try {
    payload = (await request.json()) as CreateUserPayload;
  } catch {
    return responseError("Envie os dados do usuário em JSON válido.", 400);
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (name.length < 2 || name.length > 80) {
    return responseError("Informe um nome entre 2 e 80 caracteres.", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return responseError("Informe um e-mail válido.", 400);
  }

  const passwordError = validatePassword(password, email);
  if (passwordError) return responseError(passwordError, 400);

  const { data, error: createError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
    app_metadata: {
      role: "member",
      password_rotation_required: true,
    },
  });

  if (createError || !data.user) {
    const message = createError?.message.toLowerCase().includes("already")
      ? "Já existe um usuário com este e-mail."
      : "Não foi possível criar o usuário.";
    return responseError(message, 400);
  }

  return NextResponse.json({ user: safeUser(data.user) }, { status: 201 });
}

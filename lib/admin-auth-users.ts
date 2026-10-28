export type AuthUserPage<T> = {
  data: { users: T[] } | null;
  error: unknown | null;
};

export type ListAuthUsersPage<T> = (options: {
  page: number;
  perPage: number;
}) => Promise<AuthUserPage<T>>;

const authUsersPerPage = 1000;

export async function listAllAuthUsers<T>(listPage: ListAuthUsersPage<T>) {
  const users: T[] = [];

  for (let page = 1; ; page += 1) {
    const result = await listPage({ page, perPage: authUsersPerPage });
    if (result.error) return { users: [], error: result.error };

    const pageUsers = result.data?.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < authUsersPerPage) {
      return { users, error: null };
    }
  }
}

export async function findAuthUserByEmail<T extends { email?: string | null }>(
  listPage: ListAuthUsersPage<T>,
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();

  for (let page = 1; ; page += 1) {
    const result = await listPage({ page, perPage: authUsersPerPage });
    if (result.error) return { user: null, error: result.error };

    const pageUsers = result.data?.users ?? [];
    const user = pageUsers.find(
      (candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail,
    );
    if (user) return { user, error: null };
    if (pageUsers.length < authUsersPerPage) return { user: null, error: null };
  }
}

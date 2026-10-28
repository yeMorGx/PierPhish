import { describe, expect, it, vi } from "vitest";
import {
  findAuthUserByEmail,
  listAllAuthUsers,
  type ListAuthUsersPage,
} from "@/lib/admin-auth-users";

describe("admin auth user pagination", () => {
  it("lists all pages until the final partial page", async () => {
    const listPage = vi.fn(async ({ page }: { page: number }) => ({
      data: {
        users:
          page === 1
            ? Array.from({ length: 1000 }, (_, index) => ({ id: index }))
            : [{ id: 1000 }],
      },
      error: null,
    }));

    const result = await listAllAuthUsers(listPage);

    expect(result.error).toBeNull();
    expect(result.users).toHaveLength(1001);
    expect(listPage).toHaveBeenCalledTimes(2);
    expect(listPage).toHaveBeenNthCalledWith(2, { page: 2, perPage: 1000 });
  });

  it("finds an existing user after the first page and normalizes email", async () => {
    const users = Array.from({ length: 1000 }, (_, index) => ({
      email: `person${index}@example.com`,
    }));
    users.push({ email: "  PERSON@example.com  " });
    const listPage: ListAuthUsersPage<(typeof users)[number]> = vi.fn(
      async ({ page }) => ({
        data: { users: page === 1 ? users.slice(0, 1000) : users.slice(1000) },
        error: null,
      }),
    );

    const result = await findAuthUserByEmail(listPage, " person@EXAMPLE.com ");

    expect(result.user?.email).toBe("  PERSON@example.com  ");
    expect(result.error).toBeNull();
    expect(listPage).toHaveBeenCalledTimes(2);
  });

  it("stops and returns a provider error", async () => {
    const providerError = new Error("provider unavailable");
    const listPage: ListAuthUsersPage<{ email: string }> = vi.fn(async () => ({
      data: null,
      error: providerError,
    }));

    const result = await findAuthUserByEmail(listPage, "person@example.com");

    expect(result.user).toBeNull();
    expect(result.error).toBe(providerError);
    expect(listPage).toHaveBeenCalledTimes(1);
  });
});

/**
 * Unit tests for MFA enrollment challenge endpoint
 * 
 * These tests verify that the security vulnerability where an attacker with
 * a password-only AAL1 session could enroll their own MFA factor has been mitigated.
 * 
 * The mitigation requires password reauthentication before allowing first-factor
 * MFA enrollment, preventing unauthorized MFA configuration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../app/api/account/mfa-enrollment-challenge/route";

// Mock Supabase client
const mockCreateClient = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

describe("MFA Enrollment Challenge API - Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("should reject requests without authorization token", async () => {
    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "test123" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Sessão não encontrada.");
  });

  it("should reject requests without password in body", async () => {
    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Informe sua senha para continuar.");
  });

  it("should reject requests with invalid JSON body", async () => {
    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: "invalid-json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Envie a senha em JSON válido.");
  });

  it("should reject AAL2 sessions from enrolling (already has MFA)", async () => {
    const mockAdminClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "test@example.com" } },
          error: null,
        }),
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { aal: "aal2" } },
          error: null,
        }),
      },
    };

    mockCreateClient.mockReturnValue(mockAdminClient);

    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer aal2-token",
      },
      body: JSON.stringify({ password: "correct-password" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Esta operação só é permitida antes da configuração do MFA.");
  });

  it("should reject users who already have a verified factor", async () => {
    const mockAdminClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "test@example.com" } },
          error: null,
        }),
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { aal: "aal1" } },
          error: null,
        }),
      },
    };

    const mockVerificationClient = {
      auth: {
        mfa: {
          listFactors: vi.fn().mockResolvedValue({
            data: {
              all: [{ id: "factor-1", status: "verified" }],
            },
            error: null,
          }),
        },
      },
    };

    mockCreateClient
      .mockReturnValueOnce(mockAdminClient)
      .mockReturnValueOnce(mockVerificationClient);

    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer aal1-token",
      },
      body: JSON.stringify({ password: "correct-password" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Você já possui um fator de autenticação configurado.");
  });

  it("should reject incorrect password during reauthentication", async () => {
    const mockAdminClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "test@example.com" } },
          error: null,
        }),
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { aal: "aal1" } },
          error: null,
        }),
      },
    };

    const mockVerificationClient = {
      auth: {
        mfa: {
          listFactors: vi.fn().mockResolvedValue({
            data: { all: [] },
            error: null,
          }),
        },
      },
    };

    const mockPasswordClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Invalid credentials" },
        }),
      },
    };

    mockCreateClient
      .mockReturnValueOnce(mockAdminClient)
      .mockReturnValueOnce(mockVerificationClient)
      .mockReturnValueOnce(mockPasswordClient);

    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer aal1-token",
      },
      body: JSON.stringify({ password: "wrong-password" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Senha incorreta.");
  });

  it("should authorize enrollment after successful password verification", async () => {
    const mockAdminClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { 
            user: { 
              id: "user-123", 
              email: "test@example.com",
              app_metadata: {}
            } 
          },
          error: null,
        }),
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { aal: "aal1" } },
          error: null,
        }),
        admin: {
          updateUserById: vi.fn().mockResolvedValue({
            data: { user: {} },
            error: null,
          }),
        },
      },
    };

    const mockVerificationClient = {
      auth: {
        mfa: {
          listFactors: vi.fn().mockResolvedValue({
            data: { all: [] },
            error: null,
          }),
        },
      },
    };

    const mockPasswordClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: {}, session: {} },
          error: null,
        }),
      },
    };

    mockCreateClient
      .mockReturnValueOnce(mockAdminClient)
      .mockReturnValueOnce(mockVerificationClient)
      .mockReturnValueOnce(mockPasswordClient);

    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer aal1-token",
      },
      body: JSON.stringify({ password: "correct-password" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.authorizedAt).toBeDefined();
    expect(typeof data.authorizedAt).toBe("number");

    // Verify that app_metadata was updated with enrollment authorization
    expect(mockAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        app_metadata: expect.objectContaining({
          mfa_enrollment_authorized_at: expect.any(Number),
        }),
      })
    );
  });

  it("should prevent MFA bypass by requiring password even with valid AAL1 session", async () => {
    // This test simulates the original vulnerability scenario:
    // An attacker has a valid password-only (AAL1) session but doesn't know the password
    
    const mockAdminClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "test@example.com" } },
          error: null,
        }),
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { aal: "aal1" } },
          error: null,
        }),
      },
    };

    const mockVerificationClient = {
      auth: {
        mfa: {
          listFactors: vi.fn().mockResolvedValue({
            data: { all: [] },
            error: null,
          }),
        },
      },
    };

    const mockPasswordClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Invalid credentials" },
        }),
      },
    };

    mockCreateClient
      .mockReturnValueOnce(mockAdminClient)
      .mockReturnValueOnce(mockVerificationClient)
      .mockReturnValueOnce(mockPasswordClient);

    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer stolen-aal1-session-token",
      },
      body: JSON.stringify({ password: "attacker-guessed-password" }),
    });

    const response = await POST(request);
    const data = await response.json();

    // The attacker's enrollment attempt is blocked because they don't have the correct password
    expect(response.status).toBe(401);
    expect(data.error).toBe("Senha incorreta.");
    
    // Verify password verification was attempted
    expect(mockPasswordClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "attacker-guessed-password",
    });
  });



  it("should reject invalid session tokens", async () => {
    const mockAdminClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Invalid token" },
        }),
      },
    };

    mockCreateClient.mockReturnValue(mockAdminClient);

    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token",
      },
      body: JSON.stringify({ password: "test123" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Sua sessão não é válida.");
  });

  it("should handle user update errors gracefully", async () => {
    const mockAdminClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { 
            user: { 
              id: "user-123", 
              email: "test@example.com",
              app_metadata: {}
            } 
          },
          error: null,
        }),
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { aal: "aal1" } },
          error: null,
        }),
        admin: {
          updateUserById: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        },
      },
    };

    const mockVerificationClient = {
      auth: {
        mfa: {
          listFactors: vi.fn().mockResolvedValue({
            data: { all: [] },
            error: null,
          }),
        },
      },
    };

    const mockPasswordClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: {}, session: {} },
          error: null,
        }),
      },
    };

    mockCreateClient
      .mockReturnValueOnce(mockAdminClient)
      .mockReturnValueOnce(mockVerificationClient)
      .mockReturnValueOnce(mockPasswordClient);

    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer aal1-token",
      },
      body: JSON.stringify({ password: "correct-password" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Não foi possível autorizar a configuração do MFA.");
  });
});

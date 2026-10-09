/**
 * Unit tests for MFA enrollment complete endpoint
 * 
 * These tests verify that the enrollment authorization cleanup works correctly
 * after successful MFA setup.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../app/api/account/mfa-enrollment-complete/route";

// Mock Supabase client
const mockCreateClient = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

describe("MFA Enrollment Complete API - Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("should reject requests without authorization token", async () => {
    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Sessão não encontrada.");
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

    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Sua sessão não é válida.");
  });

  it("should successfully clean up enrollment authorization timestamp", async () => {
    const mockAdminClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { 
            user: { 
              id: "user-123", 
              email: "test@example.com",
              app_metadata: {
                mfa_enrollment_authorized_at: 1234567890,
                other_field: "value"
              }
            } 
          },
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

    mockCreateClient.mockReturnValue(mockAdminClient);

    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);

    // Verify that the enrollment authorization was removed but other metadata preserved
    expect(mockAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
      "user-123",
      {
        app_metadata: {
          other_field: "value"
        }
      }
    );
  });

  it("should handle users without enrollment authorization gracefully", async () => {
    const mockAdminClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { 
            user: { 
              id: "user-123", 
              email: "test@example.com",
              app_metadata: {
                other_field: "value"
              }
            } 
          },
          error: null,
        }),
        admin: {
          updateUserById: vi.fn(),
        },
      },
    };

    mockCreateClient.mockReturnValue(mockAdminClient);

    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);

    // Should not attempt to update if field doesn't exist
    expect(mockAdminClient.auth.admin.updateUserById).not.toHaveBeenCalled();
  });



  it("should succeed even if cleanup fails (non-critical operation)", async () => {
    const mockAdminClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { 
            user: { 
              id: "user-123", 
              email: "test@example.com",
              app_metadata: {
                mfa_enrollment_authorized_at: 1234567890
              }
            } 
          },
          error: null,
        }),
        admin: {
          updateUserById: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Update failed" },
          }),
        },
      },
    };

    mockCreateClient.mockReturnValue(mockAdminClient);

    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    // Should still return success since cleanup is non-critical
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("should handle empty app_metadata", async () => {
    const mockAdminClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { 
            user: { 
              id: "user-123", 
              email: "test@example.com",
              app_metadata: null
            } 
          },
          error: null,
        }),
        admin: {
          updateUserById: vi.fn(),
        },
      },
    };

    mockCreateClient.mockReturnValue(mockAdminClient);

    const request = new NextRequest("http://localhost/api/account/mfa-enrollment-complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockAdminClient.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
});

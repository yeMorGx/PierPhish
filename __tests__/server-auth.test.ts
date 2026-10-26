/**
 * Unit tests for server-side AAL2 enforcement
 * 
 * These tests verify that the server correctly enforces AAL2 (MFA) requirements
 * and prevents AAL1 (password-only) sessions from accessing protected resources.
 */

import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { requireMfa, getBearerToken } from "../lib/server-auth";

describe("Server Auth - AAL2 Enforcement", () => {
  describe("getBearerToken", () => {
    it("should extract token from Bearer authorization header", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          Authorization: "Bearer test-token-123",
        },
      });

      const token = getBearerToken(request);
      expect(token).toBe("test-token-123");
    });

    it("should handle lowercase bearer prefix", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          Authorization: "bearer test-token-456",
        },
      });

      const token = getBearerToken(request);
      expect(token).toBe("test-token-456");
    });

    it("should return undefined for missing authorization header", () => {
      const request = new NextRequest("http://localhost/api/test");

      const token = getBearerToken(request);
      expect(token).toBeUndefined();
    });

    it("should return undefined for non-Bearer authorization", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          Authorization: "Basic dXNlcjpwYXNz",
        },
      });

      const token = getBearerToken(request);
      expect(token).toBeUndefined();
    });
  });

  describe("requireMfa", () => {
    it("should allow AAL2 sessions to proceed", async () => {
      const mockClient = {
        auth: {
          getClaims: vi.fn().mockResolvedValue({
            data: {
              claims: { aal: "aal2" },
            },
            error: null,
          }),
        },
      };

      const result = await requireMfa(mockClient as any, "valid-aal2-token");

      expect(result).toBeNull();
      expect(mockClient.auth.getClaims).toHaveBeenCalledWith("valid-aal2-token");
    });

    it("should reject AAL1 (password-only) sessions", async () => {
      const mockClient = {
        auth: {
          getClaims: vi.fn().mockResolvedValue({
            data: {
              claims: { aal: "aal1" },
            },
            error: null,
          }),
        },
      };

      const result = await requireMfa(mockClient as any, "aal1-token");

      expect(result).not.toBeNull();
      const response = result!;
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe("MFA obrigatório. Conclua a verificação em duas etapas.");
      expect(data.code).toBe("mfa_required");
    });

    it("should reject sessions without AAL claim", async () => {
      const mockClient = {
        auth: {
          getClaims: vi.fn().mockResolvedValue({
            data: {
              claims: {},
            },
            error: null,
          }),
        },
      };

      const result = await requireMfa(mockClient as any, "no-aal-token");

      expect(result).not.toBeNull();
      const response = result!;
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe("MFA obrigatório. Conclua a verificação em duas etapas.");
    });

    it("should reject sessions with invalid tokens", async () => {
      const mockClient = {
        auth: {
          getClaims: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Invalid token" },
          }),
        },
      };

      const result = await requireMfa(mockClient as any, "invalid-token");

      expect(result).not.toBeNull();
      const response = result!;
      expect(response.status).toBe(403);
    });

    it("should reject sessions with null claims", async () => {
      const mockClient = {
        auth: {
          getClaims: vi.fn().mockResolvedValue({
            data: { claims: null },
            error: null,
          }),
        },
      };

      const result = await requireMfa(mockClient as any, "null-claims-token");

      expect(result).not.toBeNull();
      const response = result!;
      expect(response.status).toBe(403);
    });

    it("should prevent MFA bypass - AAL1 session cannot access protected resources", async () => {
      // This test simulates the vulnerability scenario:
      // An attacker with a password-only (AAL1) session tries to access protected resources
      
      const mockClient = {
        auth: {
          getClaims: vi.fn().mockResolvedValue({
            data: {
              claims: { 
                aal: "aal1",
                sub: "attacker-user-id",
                email: "attacker@example.com"
              },
            },
            error: null,
          }),
        },
      };

      const result = await requireMfa(mockClient as any, "stolen-aal1-session");

      // The attacker's request is blocked
      expect(result).not.toBeNull();
      const response = result!;
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe("MFA obrigatório. Conclua a verificação em duas etapas.");
      expect(data.code).toBe("mfa_required");
    });

    it("should only accept exact 'aal2' string value", async () => {
      const testCases = [
        { aal: "AAL2", description: "uppercase" },
        { aal: "aal 2", description: "with space" },
        { aal: "aal2 ", description: "with trailing space" },
        { aal: " aal2", description: "with leading space" },
        { aal: 2, description: "number" },
        { aal: true, description: "boolean" },
        { aal: ["aal2"], description: "array" },
        { aal: { level: "aal2" }, description: "object" },
      ];

      for (const testCase of testCases) {
        const mockClient = {
          auth: {
            getClaims: vi.fn().mockResolvedValue({
              data: {
                claims: { aal: testCase.aal },
              },
              error: null,
            }),
          },
        };

        const result = await requireMfa(mockClient as any, "test-token");

        expect(result).not.toBeNull();
        const response = result!;
        expect(response.status).toBe(403);
      }
    });
  });
});

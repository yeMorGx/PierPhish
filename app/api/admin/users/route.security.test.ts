import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Set up environment variables before any imports
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Create a mock client that will be reused
let mockClient: any;

// Helper to create a chainable query mock
const createChainableMock = (finalData: any, finalError: any = null) => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: finalData, error: finalError }),
  };
  
  // Make all methods return the chain to allow chaining
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => Promise.resolve({ data: finalData, error: finalError }));
  
  // For queries that end with .eq() instead of .in()
  // We need to detect when it's the last call
  let eqCallCount = 0;
  chain.eq = vi.fn(() => {
    eqCallCount++;
    // After 3 eq() calls, assume it's the last one and return a promise
    if (eqCallCount >= 3) {
      return Promise.resolve({ data: finalData, error: finalError });
    }
    return chain;
  });
  
  return chain;
};

// Mock Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockClient),
}));

// Mock dependencies
vi.mock("@/lib/server-auth", () => ({
  requireMfa: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/server-statistics", () => ({
  recalculateWorkspaceCampaignStats: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/company-data", () => ({
  persistedPrimaryWorkspaceId: "primary-workspace-id",
}));

describe("Admin Users API - Cross-Workspace Owner Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock client for each test
    mockClient = {
      auth: {
        getUser: vi.fn(),
        admin: {
          getUserById: vi.fn(),
          deleteUser: vi.fn(),
          updateUserById: vi.fn(),
          listUsers: vi.fn(),
        },
      },
      from: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("DELETE endpoint - canOwnerManageUser authorization", () => {
    it("should prevent workspace owner from deleting a user who is an owner in another workspace", async () => {
      // Import the route handler
      const { DELETE } = await import("./route");

      // Mock the requester as a workspace owner
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "requester-id",
            email: "requester@example.com",
            app_metadata: {},
          },
        },
        error: null,
      });

      // Set up query chain mocks
      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "pierphish_workspace_members") {
          queryCallCount++;
          
          // First call: requester's memberships (owner of workspace-1)
          if (queryCallCount === 1) {
            return createChainableMock([{ workspace_id: "workspace-1", role: "owner" }]);
          }
          
          // Second call: target's memberships in requester's workspaces (non-owner)
          if (queryCallCount === 2) {
            return createChainableMock([{ workspace_id: "workspace-1", role: "admin" }]);
          }
          
          // Third call: target's owner memberships in ALL workspaces (owner in workspace-2)
          // This is the NEW security check that prevents the exploit
          if (queryCallCount === 3) {
            return createChainableMock([{ workspace_id: "workspace-2" }]);
          }
        }
        
        return createChainableMock(null);
      });

      // Mock target user exists
      mockClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "target-id", email: "target@example.com" } },
        error: null,
      });

      // Create the request
      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "DELETE",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ userId: "target-id" }),
      });

      const response = await DELETE(request as any);
      const responseData = await response.json();

      // Should be rejected with 403
      expect(response.status).toBe(403);
      expect(responseData.error).toContain("proprietário");

      // Verify deleteUser was NOT called - this is the key security assertion
      expect(mockClient.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it("should allow workspace owner to delete a non-owner user who is not an owner anywhere", async () => {
      const { DELETE } = await import("./route");

      // Mock the requester as a workspace owner
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "requester-id",
            email: "requester@example.com",
            app_metadata: {},
          },
        },
        error: null,
      });

      // Set up query chain mocks
      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "pierphish_workspace_members") {
          queryCallCount++;
          
          // First call: requester's memberships (owner of workspace-1)
          if (queryCallCount === 1) {
            return createChainableMock([{ workspace_id: "workspace-1", role: "owner" }]);
          }
          
          // Second call: target's memberships in requester's workspaces (non-owner)
          if (queryCallCount === 2) {
            return createChainableMock([{ workspace_id: "workspace-1", role: "viewer" }]);
          }
          
          // Third call: target's owner memberships in ALL workspaces (NOT an owner anywhere)
          if (queryCallCount === 3) {
            return createChainableMock([]); // Empty - not an owner anywhere
          }
        }
        
        return createChainableMock(null);
      });

      // Mock target user exists
      mockClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "target-id", email: "target@example.com" } },
        error: null,
      });

      // Mock successful deletion
      mockClient.auth.admin.deleteUser.mockResolvedValue({
        data: {},
        error: null,
      });

      // Create the request
      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "DELETE",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ userId: "target-id" }),
      });

      const response = await DELETE(request as any);
      const responseData = await response.json();

      // Should succeed
      expect(response.status).toBe(200);
      expect(responseData.ok).toBe(true);

      // Verify deleteUser WAS called - legitimate deletion is allowed
      expect(mockClient.auth.admin.deleteUser).toHaveBeenCalledWith("target-id");
    });

    it("should prevent workspace owner from deleting a user who is an owner in the same workspace", async () => {
      const { DELETE } = await import("./route");

      // Mock the requester as a workspace owner
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "requester-id",
            email: "requester@example.com",
            app_metadata: {},
          },
        },
        error: null,
      });

      // Set up query chain mocks
      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "pierphish_workspace_members") {
          queryCallCount++;
          
          // First call: requester's memberships (owner of workspace-1)
          if (queryCallCount === 1) {
            return createChainableMock([{ workspace_id: "workspace-1", role: "owner" }]);
          }
          
          // Second call: target is ALSO an owner in the same workspace
          if (queryCallCount === 2) {
            return createChainableMock([{ workspace_id: "workspace-1", role: "owner" }]);
          }
        }
        
        return createChainableMock(null);
      });

      // Create the request
      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "DELETE",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ userId: "target-id" }),
      });

      const response = await DELETE(request as any);
      const responseData = await response.json();

      // Should be rejected with 403 (caught by first check)
      expect(response.status).toBe(403);
      expect(responseData.error).toContain("proprietário");

      // Verify deleteUser was NOT called
      expect(mockClient.auth.admin.deleteUser).not.toHaveBeenCalled();
    });
  });

  describe("PATCH endpoint - reset-password action with cross-workspace owner protection", () => {
    it("should prevent workspace owner from resetting password of a user who is an owner in another workspace", async () => {
      const { PATCH } = await import("./route");

      // Mock the requester as a workspace owner
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "requester-id",
            email: "requester@example.com",
            app_metadata: {},
          },
        },
        error: null,
      });

      // Set up query chain mocks
      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "pierphish_workspace_members") {
          queryCallCount++;
          
          // First call: requester's memberships (owner of workspace-1)
          if (queryCallCount === 1) {
            return createChainableMock([{ workspace_id: "workspace-1", role: "owner" }]);
          }
          
          // Second call: target's memberships in requester's workspaces (non-owner)
          if (queryCallCount === 2) {
            return createChainableMock([{ workspace_id: "workspace-1", role: "admin" }]);
          }
          
          // Third call: target's owner memberships in ALL workspaces (owner in workspace-2)
          // This is the NEW security check that prevents the exploit
          if (queryCallCount === 3) {
            return createChainableMock([{ workspace_id: "workspace-2" }]);
          }
        }
        
        return createChainableMock(null);
      });

      // Mock target user exists
      mockClient.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            id: "target-id",
            email: "target@example.com",
            app_metadata: {},
          },
        },
        error: null,
      });

      // Create the request
      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "reset-password",
          userId: "target-id",
          password: "NewSecureP@ssw0rd123",
        }),
      });

      const response = await PATCH(request as any);
      const responseData = await response.json();

      // Should be rejected with 403
      expect(response.status).toBe(403);
      expect(responseData.error).toContain("proprietário");

      // Verify updateUserById was NOT called - this is the key security assertion
      expect(mockClient.auth.admin.updateUserById).not.toHaveBeenCalled();
    });

    it("should allow workspace owner to reset password of a non-owner user who is not an owner anywhere", async () => {
      const { PATCH } = await import("./route");

      // Mock the requester as a workspace owner
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "requester-id",
            email: "requester@example.com",
            app_metadata: {},
          },
        },
        error: null,
      });

      // Set up query chain mocks
      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "pierphish_workspace_members") {
          queryCallCount++;
          
          // First call: requester's memberships (owner of workspace-1)
          if (queryCallCount === 1) {
            return createChainableMock([{ workspace_id: "workspace-1", role: "owner" }]);
          }
          
          // Second call: target's memberships in requester's workspaces (non-owner)
          if (queryCallCount === 2) {
            return createChainableMock([{ workspace_id: "workspace-1", role: "viewer" }]);
          }
          
          // Third call: target's owner memberships in ALL workspaces (NOT an owner anywhere)
          if (queryCallCount === 3) {
            return createChainableMock([]); // Empty - not an owner anywhere
          }
        }
        
        return createChainableMock(null);
      });

      // Mock target user exists
      mockClient.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            id: "target-id",
            email: "target@example.com",
            app_metadata: {},
          },
        },
        error: null,
      });

      // Mock successful password update
      mockClient.auth.admin.updateUserById.mockResolvedValue({
        data: { user: { id: "target-id" } },
        error: null,
      });

      // Create the request
      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "reset-password",
          userId: "target-id",
          password: "NewSecureP@ssw0rd123",
        }),
      });

      const response = await PATCH(request as any);
      const responseData = await response.json();

      // Should succeed
      expect(response.status).toBe(200);
      expect(responseData.ok).toBe(true);

      // Verify updateUserById WAS called - legitimate password reset is allowed
      expect(mockClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        "target-id",
        expect.objectContaining({
          password: "NewSecureP@ssw0rd123",
        })
      );
    });
  });

  describe("Authorization boundary tests", () => {
    it("should reject when target is not a member of requester's workspace", async () => {
      const { DELETE } = await import("./route");

      // Mock the requester as a workspace owner
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "requester-id",
            email: "requester@example.com",
            app_metadata: {},
          },
        },
        error: null,
      });

      // Set up query chain mocks
      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "pierphish_workspace_members") {
          queryCallCount++;
          
          // First call: requester's memberships (owner of workspace-1)
          if (queryCallCount === 1) {
            return createChainableMock([{ workspace_id: "workspace-1", role: "owner" }]);
          }
          
          // Second call: target has NO memberships in requester's workspace
          if (queryCallCount === 2) {
            return createChainableMock([]); // Not a member of requester's workspace
          }
        }
        
        return createChainableMock(null);
      });

      // Create the request
      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "DELETE",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ userId: "target-id" }),
      });

      const response = await DELETE(request as any);
      const responseData = await response.json();

      // Should be rejected with 403
      expect(response.status).toBe(403);
      expect(responseData.error).toContain("workspace");

      // Verify deleteUser was NOT called
      expect(mockClient.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it("should reject when requester tries to delete themselves", async () => {
      const { DELETE } = await import("./route");

      // Mock the requester as a workspace owner
      mockClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "same-user-id",
            email: "user@example.com",
            app_metadata: {},
          },
        },
        error: null,
      });

      // Set up query chain mocks
      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "pierphish_workspace_members") {
          queryCallCount++;
          
          // First call: requester's memberships
          if (queryCallCount === 1) {
            return createChainableMock([{ workspace_id: "workspace-1", role: "owner" }]);
          }
        }
        
        return createChainableMock(null);
      });

      // Create the request - trying to delete themselves
      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "DELETE",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ userId: "same-user-id" }),
      });

      const response = await DELETE(request as any);
      const responseData = await response.json();

      // Should be rejected with 400
      expect(response.status).toBe(400);
      expect(responseData.error).toContain("própria conta");

      // Verify deleteUser was NOT called
      expect(mockClient.auth.admin.deleteUser).not.toHaveBeenCalled();
    });
  });
});

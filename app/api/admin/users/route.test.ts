import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock environment variables before importing the module
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Mock Supabase client factory
const createMockClient = () => {
  const mockClient = {
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
  return mockClient;
};

// Mock the Supabase module
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => createMockClient()),
}));

// Mock the server-auth module
vi.mock("@/lib/server-auth", () => ({
  requireMfa: vi.fn().mockResolvedValue(null),
}));

// Mock the server-statistics module
vi.mock("@/lib/server-statistics", () => ({
  recalculateWorkspaceCampaignStats: vi.fn().mockResolvedValue(undefined),
}));

// Mock the company-data module
vi.mock("@/lib/company-data", () => ({
  persistedPrimaryWorkspaceId: "primary-workspace-id",
}));

// Set up environment variables before any imports
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Create a mock client that will be reused
let mockClient: any;

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
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-1", role: "owner" }],
                  error: null,
                })
              ),
            };
          }
          
          // Second call: target's memberships in requester's workspaces (non-owner)
          if (queryCallCount === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-1", role: "admin" }],
                  error: null,
                })
              ),
            };
          }
          
          // Third call: target's owner memberships in ALL workspaces (owner in workspace-2)
          if (queryCallCount === 3) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-2" }],
                  error: null,
                })
              ),
            };
          }
        }
        
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
        };
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

      // Verify deleteUser was NOT called
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
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-1", role: "owner" }],
                  error: null,
                })
              ),
            };
          }
          
          // Second call: target's memberships in requester's workspaces (non-owner)
          if (queryCallCount === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-1", role: "viewer" }],
                  error: null,
                })
              ),
            };
          }
          
          // Third call: target's owner memberships in ALL workspaces (NOT an owner anywhere)
          if (queryCallCount === 3) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [], // Empty - not an owner anywhere
                  error: null,
                })
              ),
            };
          }
        }
        
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
        };
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

      // Verify deleteUser WAS called
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
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-1", role: "owner" }],
                  error: null,
                })
              ),
            };
          }
          
          // Second call: target is ALSO an owner in the same workspace
          if (queryCallCount === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-1", role: "owner" }],
                  error: null,
                })
              ),
            };
          }
        }
        
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
        };
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
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-1", role: "owner" }],
                  error: null,
                })
              ),
            };
          }
          
          // Second call: target's memberships in requester's workspaces (non-owner)
          if (queryCallCount === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-1", role: "admin" }],
                  error: null,
                })
              ),
            };
          }
          
          // Third call: target's owner memberships in ALL workspaces (owner in workspace-2)
          if (queryCallCount === 3) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-2" }],
                  error: null,
                })
              ),
            };
          }
        }
        
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
        };
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

      // Verify updateUserById was NOT called
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
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-1", role: "owner" }],
                  error: null,
                })
              ),
            };
          }
          
          // Second call: target's memberships in requester's workspaces (non-owner)
          if (queryCallCount === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-1", role: "viewer" }],
                  error: null,
                })
              ),
            };
          }
          
          // Third call: target's owner memberships in ALL workspaces (NOT an owner anywhere)
          if (queryCallCount === 3) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [], // Empty - not an owner anywhere
                  error: null,
                })
              ),
            };
          }
        }
        
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
        };
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

      // Verify updateUserById WAS called
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
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-1", role: "owner" }],
                  error: null,
                })
              ),
            };
          }
          
          // Second call: target has NO memberships in requester's workspace
          if (queryCallCount === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [], // Not a member of requester's workspace
                  error: null,
                })
              ),
            };
          }
        }
        
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
        };
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
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnValue(
                Promise.resolve({
                  data: [{ workspace_id: "workspace-1", role: "owner" }],
                  error: null,
                })
              ),
            };
          }
        }
        
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
        };
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

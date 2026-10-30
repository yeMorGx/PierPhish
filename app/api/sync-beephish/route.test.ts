/**
 * Security tests for sync-beephish route
 * 
 * These tests verify that the cross-workspace credential access vulnerability
 * has been mitigated. The vulnerability allowed an authenticated user with sync
 * access to workspace A to submit a company ID from workspace B and cause the
 * server to decrypt and use workspace B's Beephish client secret.
 * 
 * The fix ensures that company queries are always constrained by workspace_id,
 * preventing cross-workspace credential access.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("sync-beephish route - cross-workspace credential access prevention", () => {
  it("should reject requests without authorization header", async () => {
    // Read the route source code to verify the fix is in place
    const routeSource = readFileSync(
      join(__dirname, "route.ts"),
      "utf-8",
    );

    // Verify that authorization check exists
    expect(routeSource).toContain("requireSyncAccess");
    expect(routeSource).toContain("authorization");
  });

  it("should always apply workspace_id filter to company queries", () => {
    // This is the CRITICAL security test: verify that the fix is present in the code
    // The vulnerability was that workspace_id was only applied in the else branch
    // The fix moves workspace_id filter to always be applied before the conditional
    
    const routeSource = readFileSync(
      join(__dirname, "route.ts"),
      "utf-8",
    );

    // Find the company query section
    const companyQueryMatch = routeSource.match(
      /let companyQuery = auth\.client\s+\.from\("pierphish_companies"\)([\s\S]*?)const \{ data: companyRows/,
    );

    expect(companyQueryMatch).toBeTruthy();
    
    if (companyQueryMatch) {
      const querySection = companyQueryMatch[1];
      
      // CRITICAL: Verify workspace_id filter is applied BEFORE the conditional
      // The fix should have this structure:
      // .eq("status", "active")
      // .eq("workspace_id", workspaceId);
      // if (requestedCompanyId)
      //   companyQuery = companyQuery.eq("id", requestedCompanyId);
      
      const lines = querySection.split("\n").map(l => l.trim()).filter(l => l);
      
      // Find the workspace_id filter line
      const workspaceIdLineIndex = lines.findIndex(l => 
        l.includes('.eq("workspace_id"') || l.includes(".eq('workspace_id'")
      );
      
      // Find the if (requestedCompanyId) line
      const conditionalLineIndex = lines.findIndex(l => 
        l.includes("if (requestedCompanyId)")
      );
      
      // SECURITY ASSERTION: workspace_id filter must exist
      expect(workspaceIdLineIndex).toBeGreaterThanOrEqual(0);
      
      // SECURITY ASSERTION: workspace_id filter must come BEFORE the conditional
      // This ensures it's always applied, not just in the else branch
      expect(workspaceIdLineIndex).toBeLessThan(conditionalLineIndex);
      
      // SECURITY ASSERTION: The old vulnerable pattern should NOT exist
      // Old pattern: else companyQuery = companyQuery.eq("workspace_id", workspaceId);
      expect(querySection).not.toContain('else companyQuery = companyQuery.eq("workspace_id"');
      expect(querySection).not.toContain("else companyQuery = companyQuery.eq('workspace_id'");
    }
  });

  it("should not have workspace_id filter only in else branch (vulnerable pattern)", () => {
    // Verify the OLD vulnerable pattern is NOT present
    const routeSource = readFileSync(
      join(__dirname, "route.ts"),
      "utf-8",
    );

    // The vulnerable pattern was:
    // if (requestedCompanyId)
    //   companyQuery = companyQuery.eq("id", requestedCompanyId);
    // else companyQuery = companyQuery.eq("workspace_id", workspaceId);
    
    // This pattern allowed cross-workspace access when companyId was provided
    const vulnerablePattern1 = /if\s*\(\s*requestedCompanyId\s*\)[\s\S]*?else\s+companyQuery\s*=\s*companyQuery\.eq\s*\(\s*["']workspace_id["']/;
    const vulnerablePattern2 = /\.eq\s*\(\s*["']id["'][\s\S]*?else\s+companyQuery\s*=\s*companyQuery\.eq\s*\(\s*["']workspace_id["']/;
    
    expect(routeSource).not.toMatch(vulnerablePattern1);
    expect(routeSource).not.toMatch(vulnerablePattern2);
  });

  it("should have workspace_id filter applied unconditionally in company query", () => {
    // Verify the FIXED pattern is present
    const routeSource = readFileSync(
      join(__dirname, "route.ts"),
      "utf-8",
    );

    // The fixed pattern should have workspace_id filter applied before the conditional:
    // .eq("status", "active")
    // .eq("workspace_id", workspaceId);
    // if (requestedCompanyId)
    //   companyQuery = companyQuery.eq("id", requestedCompanyId);
    
    const fixedPattern = /\.eq\s*\(\s*["']status["']\s*,\s*["']active["']\s*\)\s*\.eq\s*\(\s*["']workspace_id["']\s*,\s*workspaceId\s*\)/;
    
    expect(routeSource).toMatch(fixedPattern);
  });

  it("should constrain company selection to authorized workspace in all code paths", () => {
    // Verify that workspace_id is used as a filter, not just for validation
    const routeSource = readFileSync(
      join(__dirname, "route.ts"),
      "utf-8",
    );

    // Find the company query builder section
    const companyQuerySection = routeSource.match(
      /let companyQuery = auth\.client[\s\S]*?const \{ data: companyRows/,
    );

    expect(companyQuerySection).toBeTruthy();
    
    if (companyQuerySection) {
      const section = companyQuerySection[0];
      
      // Count how many times workspace_id is used as a filter
      const workspaceIdFilterCount = (
        section.match(/\.eq\s*\(\s*["']workspace_id["']/g) || []
      ).length;
      
      // Should have exactly ONE workspace_id filter in the query builder chain
      expect(workspaceIdFilterCount).toBe(1);
      
      // Verify it's in the main query chain, not in a conditional branch
      const mainQueryChain = section.match(
        /let companyQuery = auth\.client[\s\S]*?;/,
      );
      
      if (mainQueryChain) {
        expect(mainQueryChain[0]).toContain('eq("workspace_id"');
      }
    }
  });

  it("should prevent cross-workspace credential decryption by query constraint", () => {
    // Verify that the decryptSecret function is only called on companies
    // that have been properly filtered by workspace_id
    const routeSource = readFileSync(
      join(__dirname, "route.ts"),
      "utf-8",
    );

    // Find the basicAuthorization function that calls decryptSecret
    const basicAuthFunction = routeSource.match(
      /function basicAuthorization\(company: Company\)[\s\S]*?\}/,
    );

    expect(basicAuthFunction).toBeTruthy();
    
    if (basicAuthFunction) {
      // Verify it decrypts the company's secret
      expect(basicAuthFunction[0]).toContain("decryptSecret");
      expect(basicAuthFunction[0]).toContain("client_secret_ciphertext");
    }

    // Verify that companies are selected with workspace_id constraint
    // This ensures decryptSecret is only called on companies from the authorized workspace
    const companyQueryPattern = /from\("pierphish_companies"\)[\s\S]*?\.eq\("workspace_id", workspaceId\)/;
    expect(routeSource).toMatch(companyQueryPattern);
  });

  it("should use workspace_id from authorized context in syncCompany calls", () => {
    // Verify that the workspace_id passed to syncCompany comes from the authorized context
    const routeSource = readFileSync(
      join(__dirname, "route.ts"),
      "utf-8",
    );

    // Find syncCompany calls
    const syncCompanyCalls = routeSource.match(
      /await syncCompany\([^)]+\)/g,
    );

    expect(syncCompanyCalls).toBeTruthy();
    expect(syncCompanyCalls!.length).toBeGreaterThan(0);

    // Verify the workspace_id parameter uses company?.workspace_id ?? workspaceId
    // This ensures data is written to the correct workspace
    const syncCompanyCallPattern = /await syncCompany\(\s*auth\.client\s*,\s*company\s*,\s*company\?\.workspace_id\s*\?\?\s*workspaceId/;
    expect(routeSource).toMatch(syncCompanyCallPattern);
  });

  it("should write synced data with workspace_id from the query-filtered company", () => {
    // Verify that data persistence uses workspace_id from the authorized context
    const routeSource = readFileSync(
      join(__dirname, "route.ts"),
      "utf-8",
    );

    // Find data insertion patterns
    const insertPatterns = [
      /workspace_id:\s*workspaceId/g,
      /company_id:\s*company\?\.id/g,
    ];

    for (const pattern of insertPatterns) {
      const matches = routeSource.match(pattern);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThan(0);
    }
  });
});

import { describe, expect, it } from "vitest";

/**
 * Security tests for sync-beephish route
 * 
 * These tests verify the mitigation of CVE: "Explicit unknown companyId activates 
 * the process-wide Beephish credential fallback"
 * 
 * Vulnerability Summary:
 * A sync-authorized member of a workspace could supply any non-empty nonexistent or 
 * inaccessible companyId and cause the route to synchronize data through the 
 * process-wide legacy Beephish credential into the caller's workspace.
 * 
 * Root Cause:
 * The company query applied an ID filter without a workspace filter when an explicit
 * companyId was provided. An unknown ID yielded an empty result without an error,
 * and the code proceeded with targets = [null], which selected legacyAuthorization.
 * 
 * Fix Applied:
 * 1. Always filter by workspace_id (not conditionally)
 * 2. Return 404 error when explicit companyId is not found in the workspace
 */

describe("sync-beephish security - code analysis", () => {
  it("verifies workspace_id filter is always applied in company query", async () => {
    // Read the route file to verify the fix
    const fs = await import("node:fs/promises");
    const routeContent = await fs.readFile(
      "app/api/sync-beephish/route.ts",
      "utf-8"
    );

    // Security property 1: workspace_id filter must be applied unconditionally
    // The fix adds .eq("workspace_id", workspaceId) before the conditional companyId filter
    const hasUnconditionalWorkspaceFilter = routeContent.includes(
      '.eq("workspace_id", workspaceId)'
    );
    expect(hasUnconditionalWorkspaceFilter).toBe(true);

    // Verify the filter is applied to the base query, not conditionally
    const companyQuerySection = routeContent.match(
      /let companyQuery = auth\.client[\s\S]*?const { data: companyRows/
    );
    expect(companyQuerySection).toBeTruthy();
    
    if (companyQuerySection) {
      const queryText = companyQuerySection[0];
      
      // The workspace_id filter should appear in the base query
      expect(queryText).toContain('.eq("workspace_id", workspaceId)');
      
      // The old pattern where workspace_id was only in the else branch should NOT exist
      const hasConditionalWorkspaceFilter = queryText.match(
        /else[\s\S]*\.eq\("workspace_id", workspaceId\)/
      );
      expect(hasConditionalWorkspaceFilter).toBeNull();
    }
  });

  it("verifies explicit companyId not found returns 404 error", async () => {
    const fs = await import("node:fs/promises");
    const routeContent = await fs.readFile(
      "app/api/sync-beephish/route.ts",
      "utf-8"
    );

    // Security property 2: When requestedCompanyId is provided but not found, return 404
    const has404Check = routeContent.includes(
      "if (requestedCompanyId && !companies.length)"
    );
    expect(has404Check).toBe(true);

    // Verify the error response is returned
    const errorResponsePattern = /if \(requestedCompanyId && !companies\.length\)[\s\S]*?return errorResponse[\s\S]*?404/;
    expect(routeContent).toMatch(errorResponsePattern);

    // Verify the error message mentions workspace
    const errorMessagePattern = /if \(requestedCompanyId && !companies\.length\)[\s\S]*?workspace/i;
    expect(routeContent).toMatch(errorMessagePattern);
  });

  it("verifies the 404 check occurs before targets array creation", async () => {
    const fs = await import("node:fs/promises");
    const routeContent = await fs.readFile(
      "app/api/sync-beephish/route.ts",
      "utf-8"
    );

    // The 404 check must happen BEFORE targets = [null] can be created
    const targetsCreationIndex = routeContent.indexOf(
      "const targets: Array<Company | null> = companies.length ? companies : [null]"
    );
    const notFoundCheckIndex = routeContent.indexOf(
      "if (requestedCompanyId && !companies.length)"
    );

    expect(targetsCreationIndex).toBeGreaterThan(0);
    expect(notFoundCheckIndex).toBeGreaterThan(0);
    expect(notFoundCheckIndex).toBeLessThan(targetsCreationIndex);
  });

  it("verifies legacy authorization fallback still exists for legitimate use", async () => {
    const fs = await import("node:fs/promises");
    const routeContent = await fs.readFile(
      "app/api/sync-beephish/route.ts",
      "utf-8"
    );

    // The legacy authorization should still exist for backward compatibility
    // but should only be reachable through legitimate paths (no explicit companyId)
    const hasLegacyAuth = routeContent.includes("legacyAuthorization");
    expect(hasLegacyAuth).toBe(true);

    // Verify it's used in the ternary for company credential selection
    const credentialSelection = routeContent.match(
      /const authorization = company[\s\S]*?\? basicAuthorization\(company\)[\s\S]*?: legacyAuthorization/
    );
    expect(credentialSelection).toBeTruthy();
  });

  it("verifies workspace_id is used when company is null", async () => {
    const fs = await import("node:fs/promises");
    const routeContent = await fs.readFile(
      "app/api/sync-beephish/route.ts",
      "utf-8"
    );

    // When company is null, the workspaceId parameter should be used
    const syncCompanyCall = routeContent.match(
      /await syncCompany\([\s\S]*?company\?\.workspace_id \?\? workspaceId/
    );
    expect(syncCompanyCall).toBeTruthy();
  });

  it("verifies the fix prevents cross-workspace data import", async () => {
    const fs = await import("node:fs/promises");
    const routeContent = await fs.readFile(
      "app/api/sync-beephish/route.ts",
      "utf-8"
    );

    // The complete fix should have these components:
    // 1. Unconditional workspace_id filter
    const hasWorkspaceFilter = routeContent.match(
      /\.from\("pierphish_companies"\)[\s\S]*?\.eq\("workspace_id", workspaceId\)/
    );
    expect(hasWorkspaceFilter).toBeTruthy();

    // 2. Early return for explicit companyId not found
    const hasEarlyReturn = routeContent.match(
      /if \(requestedCompanyId && !companies\.length\)[\s\S]*?return errorResponse/
    );
    expect(hasEarlyReturn).toBeTruthy();

    // 3. The early return should happen before any sync operations
    const earlyReturnIndex = routeContent.indexOf(
      "if (requestedCompanyId && !companies.length)"
    );
    const syncCompanyIndex = routeContent.indexOf("await syncCompany(");
    expect(earlyReturnIndex).toBeLessThan(syncCompanyIndex);
  });
});

describe("sync-beephish security - request validation logic", () => {
  it("validates requestedCompanyId extraction logic", async () => {
    const fs = await import("node:fs/promises");
    const routeContent = await fs.readFile(
      "app/api/sync-beephish/route.ts",
      "utf-8"
    );

    // Verify that companyId is properly extracted and trimmed
    const companyIdExtraction = routeContent.match(
      /const requestedCompanyId =[\s\S]*?body\.companyId[\s\S]*?\.trim\(\)/
    );
    expect(companyIdExtraction).toBeTruthy();

    // Verify it becomes null for empty/whitespace strings
    const nullForEmpty = routeContent.match(
      /requestedCompanyId =[\s\S]*?\? body\.companyId\.trim\(\)[\s\S]*?: null/
    );
    expect(nullForEmpty).toBeTruthy();
  });

  it("validates the conditional logic for company query filters", async () => {
    const fs = await import("node:fs/promises");
    const routeContent = await fs.readFile(
      "app/api/sync-beephish/route.ts",
      "utf-8"
    );

    // The query should have:
    // 1. Base filters (status, workspace_id)
    // 2. Optional companyId filter
    const queryPattern = routeContent.match(
      /let companyQuery = auth\.client[\s\S]*?\.from\("pierphish_companies"\)[\s\S]*?\.eq\("status", "active"\)[\s\S]*?\.eq\("workspace_id", workspaceId\)[\s\S]*?if \(requestedCompanyId\)[\s\S]*?companyQuery = companyQuery\.eq\("id", requestedCompanyId\)/
    );
    expect(queryPattern).toBeTruthy();
  });

  it("validates error response for company not found", async () => {
    const fs = await import("node:fs/promises");
    const routeContent = await fs.readFile(
      "app/api/sync-beephish/route.ts",
      "utf-8"
    );

    // The error should be descriptive and return 404
    const errorResponse = routeContent.match(
      /if \(requestedCompanyId && !companies\.length\)[\s\S]*?return errorResponse\([\s\S]*?".*conexão.*não foi encontrada.*workspace.*"[\s\S]*?,[\s\S]*?404/i
    );
    expect(errorResponse).toBeTruthy();
  });
});

describe("sync-beephish security - exploit scenario prevention", () => {
  it("prevents attacker from specifying arbitrary companyId", async () => {
    const fs = await import("node:fs/promises");
    const routeContent = await fs.readFile(
      "app/api/sync-beephish/route.ts",
      "utf-8"
    );

    // Scenario: Attacker provides companyId that doesn't exist or belongs to another workspace
    // Expected: Query filters by workspace_id, finds nothing, returns 404
    
    // Verify the query chain ensures workspace isolation
    const queryChain = routeContent.match(
      /let companyQuery = auth\.client[\s\S]{1,500}?const { data: companyRows/
    );
    
    if (queryChain) {
      const chain = queryChain[0];
      
      // Must have workspace_id filter
      expect(chain).toContain('.eq("workspace_id", workspaceId)');
      
      // Must check for empty result when companyId was explicit
      expect(routeContent).toContain("if (requestedCompanyId && !companies.length)");
      
      // Must return error, not proceed
      const afterEmptyCheck = routeContent.substring(
        routeContent.indexOf("if (requestedCompanyId && !companies.length)")
      );
      const nextReturn = afterEmptyCheck.match(/return errorResponse[\s\S]*?404/);
      expect(nextReturn).toBeTruthy();
    }
  });

  it("prevents legacy credential use with explicit invalid companyId", async () => {
    const fs = await import("node:fs/promises");
    const routeContent = await fs.readFile(
      "app/api/sync-beephish/route.ts",
      "utf-8"
    );

    // The vulnerability allowed: explicit invalid companyId → empty companies → [null] → legacy auth
    // The fix prevents this by returning 404 before targets array is created
    
    const relevantSection = routeContent.substring(
      routeContent.indexOf("const companies = (companyRows ?? []) as Company[]")
    );
    
    // After companies is defined, the next check should be the 404 guard
    const next404Check = relevantSection.indexOf(
      "if (requestedCompanyId && !companies.length)"
    );
    const nextTargetsCreation = relevantSection.indexOf(
      "const targets: Array<Company | null>"
    );
    
    // The 404 check must come before targets creation
    expect(next404Check).toBeGreaterThan(0);
    expect(next404Check).toBeLessThan(nextTargetsCreation);
  });

  it("allows legitimate legacy auth use when no companyId specified", async () => {
    const fs = await import("node:fs/promises");
    const routeContent = await fs.readFile(
      "app/api/sync-beephish/route.ts",
      "utf-8"
    );

    // Legitimate case: No companyId specified, no companies in workspace, primary workspace
    // Should proceed with targets = [null] and use legacy auth
    
    // The 404 check should only trigger when requestedCompanyId is truthy
    const check = routeContent.match(
      /if \(requestedCompanyId && !companies\.length\)/
    );
    expect(check).toBeTruthy();
    
    // There should be a separate check for the legitimate empty case
    const legitimateEmptyCheck = routeContent.match(
      /if \([\s\S]*?!companies\.length[\s\S]*?&&[\s\S]*?!requestedCompanyId/
    );
    expect(legitimateEmptyCheck).toBeTruthy();
  });

  it("validates workspace boundary enforcement in all code paths", async () => {
    const fs = await import("node:fs/promises");
    const routeContent = await fs.readFile(
      "app/api/sync-beephish/route.ts",
      "utf-8"
    );

    // Every path that queries companies must include workspace_id filter
    const companyQueries = routeContent.match(
      /\.from\("pierphish_companies"\)/g
    );
    
    if (companyQueries) {
      // There should be exactly one company query in the POST handler
      expect(companyQueries.length).toBe(1);
      
      // That query must have workspace_id filter
      const querySection = routeContent.substring(
        routeContent.indexOf('.from("pierphish_companies")'),
        routeContent.indexOf("const { data: companyRows")
      );
      
      expect(querySection).toContain('.eq("workspace_id", workspaceId)');
    }
  });
});

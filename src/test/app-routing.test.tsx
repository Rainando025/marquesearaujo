import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { routeTree } from "@/routeTree.gen";

describe("App routing and security", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches a page for /auth", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes("/auth");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("guarantees 'primeiro acesso' and open signup are removed from auth.tsx for security", () => {
    const authCode = fs.readFileSync(path.resolve(__dirname, "../routes/auth.tsx"), "utf8");
    expect(authCode).not.toContain("Primeiro acesso");
    expect(authCode).not.toContain("signUp");
    expect(authCode).toContain("signInWithPassword");
  });
});

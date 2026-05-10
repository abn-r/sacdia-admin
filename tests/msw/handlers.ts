/**
 * Default MSW request handlers.
 *
 * These are the baseline stubs loaded into the server for every test run.
 * Individual tests can override or extend them with `server.use(...)` to
 * simulate specific scenarios (errors, slow responses, etc.).
 *
 * The auth endpoints are left empty here because login-form tests mock the
 * server action directly via `vi.mock("@/lib/auth/actions")` — the form does
 * not issue HTTP requests itself. Handlers are provided here for future
 * component tests that call the API client directly (e.g. data tables,
 * dashboards with SWR/React Query fetches).
 */
import { http, HttpResponse } from "msw";

export const handlers: Parameters<typeof import("msw/node").setupServer>[0][] =
  [
    /**
     * Health check — useful to verify MSW is wired correctly in new tests.
     * Override per test for specific scenarios.
     */
    http.get("http://localhost:3000/api/v1/health", () => {
      return HttpResponse.json({ status: "ok" });
    }),

    /**
     * Fallback for the token relay endpoint used by the browser-side api client.
     * In Node/Vitest this path is never hit, but listing it prevents accidental
     * "unhandled request" errors if the client-side code path is exercised.
     */
    http.get("/api/auth/token", () => {
      return HttpResponse.json({ token: null });
    }),
  ];

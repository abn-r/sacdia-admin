import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./tests/msw/server";

/**
 * MSW lifecycle — runs for every test file.
 *
 * beforeAll  → start the server once per file
 * afterEach  → reset any per-test handler overrides (`server.use(...)`)
 * afterAll   → shut down cleanly
 *
 * `onUnhandledRequest: "error"` keeps tests strict: any fetch without a
 * matching handler fails immediately rather than silently reaching the network.
 */
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

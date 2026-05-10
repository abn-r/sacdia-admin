/**
 * MSW Node server — used in Vitest (jsdom environment).
 *
 * Import this server in `vitest.setup.ts` to activate MSW for all tests.
 * Individual tests can call `server.use(...)` to add or override handlers.
 *
 * Configuration notes:
 * - `onUnhandledRequest: "error"` (strict mode): any outgoing fetch that has
 *   no matching handler causes an immediate test failure. This is intentional —
 *   it surfaces accidental real network calls early rather than letting them
 *   silently time-out or return garbage. Add a handler in `handlers.ts` or
 *   inline with `server.use(...)` whenever a component needs a new endpoint.
 */
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

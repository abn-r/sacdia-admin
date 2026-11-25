type Messages = Record<string, unknown>;

export const ROOT_CLIENT_MESSAGE_NAMESPACES = [
  "auth",
  "nav",
  "shared",
  // Public access pages (login, forgot/reset password, verify email) render outside the dashboard.
  "admin.access",
] as const;

export function pickMessages(
  messages: object,
  namespaces: readonly string[],
): Messages {
  const source = messages as Messages;
  const result: Messages = {};

  for (const namespace of namespaces) {
    // A dotted namespace ("admin.access") keeps only that branch, nested under its parents.
    const path = namespace.split(".");
    let from: unknown = source;
    for (const key of path) {
      from =
        from && typeof from === "object" && Object.prototype.hasOwnProperty.call(from, key)
          ? (from as Messages)[key]
          : undefined;
    }
    if (from === undefined) continue;

    let into = result;
    for (const key of path.slice(0, -1)) {
      const next = into[key];
      if (!next || typeof next !== "object") into[key] = {};
      into = into[key] as Messages;
    }
    into[path[path.length - 1]] = from;
  }

  return result;
}

export function getClientMessageNamespacesForDashboardPath(
  _pathname: string,
  messages: object,
): string[] {
  // Dashboard layouts are preserved during client navigation in the Next.js
  // App Router. Route-scoped message subsets can therefore become stale after
  // navigating between dashboard pages, causing raw translation keys to render
  // until a hard reload. Prefer correctness over payload micro-optimization.
  return Object.keys(messages);
}

type Messages = Record<string, unknown>;

export const ROOT_CLIENT_MESSAGE_NAMESPACES = [
  "auth",
  "nav",
  "shared",
] as const;

export function pickMessages(
  messages: object,
  namespaces: readonly string[],
): Messages {
  const source = messages as Messages;
  const result: Messages = {};

  for (const namespace of namespaces) {
    if (Object.prototype.hasOwnProperty.call(source, namespace)) {
      result[namespace] = source[namespace];
    }
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

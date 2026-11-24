import type { ContinuationListItem } from "@/lib/api/annual-continuations";

export type SuggestedClassView =
  | { kind: "complete" }
  | { kind: "named"; name: string }
  | { kind: "pending" };

/**
 * The class suggested for an annual enrollment, by name: the API returns a
 * class id, and people never read ids. Falls back to "pending" when the name
 * is not in the section's class catalog.
 */
export function suggestedClassView(
  item: ContinuationListItem,
  classes: ReadonlyArray<{ class_id: number; name: string }>,
): SuggestedClassView {
  const suggested = item.suggested_class;
  if (suggested.status === "complete") return { kind: "complete" };
  if (suggested.status === "resolved" && suggested.class_id != null) {
    const match = classes.find((row) => row.class_id === suggested.class_id);
    if (match) return { kind: "named", name: match.name };
  }
  return { kind: "pending" };
}

export const KNOWN_CONTINUATION_BLOCK_CODES = ["MR_CONSENT_NOT_VERIFIED"] as const;

export function isKnownContinuationBlockCode(
  code: string | null | undefined,
): code is (typeof KNOWN_CONTINUATION_BLOCK_CODES)[number] {
  return (KNOWN_CONTINUATION_BLOCK_CODES as readonly string[]).includes(code ?? "");
}

/** Blocked people stay listed, dimmed, with the reason. Path-complete people are not blocked, just done. */
export function isContinuationSelectable(item: ContinuationListItem): boolean {
  return item.eligibility === "eligible";
}

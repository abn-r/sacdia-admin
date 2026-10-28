/**
 * Payments created from a field payment order carry a technical marker in
 * `notes` (`field_payment_order:<uuid>`). The camporee payment ledger matches
 * payments to orders through it, so it must survive edits, but it is not
 * something the user wrote and must not be shown or edited as a note.
 */

const ORDER_MARKER_PREFIX = "field_payment_order:";
const ORDER_MARKER_PATTERN = /field_payment_order:([^\s,;]+)/g;

export type SplitPaymentNotes = {
  /** Notes without the technical marker (what the user may read and edit). */
  userNotes: string;
  /** Id of the payment order that produced the payment, when the marker exists. */
  orderId: string | null;
};

export function splitPaymentNotes(notes: string | null | undefined): SplitPaymentNotes {
  const raw = notes ?? "";
  let orderId: string | null = null;

  const userNotes = raw
    .replace(ORDER_MARKER_PATTERN, (_match, id: string) => {
      orderId ??= id;
      return "";
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { userNotes, orderId };
}

/** Notes to persist: the user's text plus the preserved marker, or undefined when both are empty. */
export function joinPaymentNotes(
  userNotes: string | null | undefined,
  orderId: string | null,
): string | undefined {
  const text = (userNotes ?? "").trim();
  if (!orderId) return text || undefined;
  const marker = `${ORDER_MARKER_PREFIX}${orderId}`;
  return text ? `${text}\n${marker}` : marker;
}

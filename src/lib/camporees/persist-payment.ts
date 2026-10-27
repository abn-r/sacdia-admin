export type PersistPaymentApi<C, P> = {
  create: (camporeeId: C, memberId: string, payload: P) => Promise<unknown>;
  update: (paymentId: string, payload: P) => Promise<unknown>;
};

export type PersistPaymentInput<C, P> = {
  camporeeId: C;
  memberId: string;
  payload: P;
  /** Payment being edited (edit mode). */
  editingId?: string | null;
  /** Payment this create form already saved before a failed voucher upload. */
  savedId?: string | null;
};

/** The backend returns the created row directly or wrapped in `{ data }`. */
function readCreatedId(created: unknown): string | null {
  if (!created || typeof created !== "object") return null;
  const row =
    "camporee_payment_id" in created
      ? (created as { camporee_payment_id?: unknown })
      : ((created as { data?: { camporee_payment_id?: unknown } }).data ?? null);
  return row && typeof row.camporee_payment_id === "string" ? row.camporee_payment_id : null;
}

/**
 * Saves the payment row and returns its id. Creates only when nothing was
 * saved yet: an edit, or a retry after the voucher upload failed, updates the
 * existing row so a resubmit can never duplicate the payment.
 */
export async function persistCamporeePayment<C, P>(
  input: PersistPaymentInput<C, P>,
  api: PersistPaymentApi<C, P>,
): Promise<string | null> {
  const existingId = input.editingId ?? input.savedId ?? null;
  if (existingId) {
    await api.update(existingId, input.payload);
    return existingId;
  }
  const created = await api.create(input.camporeeId, input.memberId, input.payload);
  return readCreatedId(created);
}

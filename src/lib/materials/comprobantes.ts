import type { Comprobante } from "@/lib/types/materials";

type ComprobantesPayload =
  | Comprobante[]
  | { data?: Comprobante[] | null }
  | null
  | undefined;

/** Normalizes API shapes: Comprobante[] or { data: Comprobante[] }. */
export function extractComprobantes(payload: ComprobantesPayload): Comprobante[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

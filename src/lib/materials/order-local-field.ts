import type { Orden } from "@/lib/types/materials";

/**
 * Local field of a materials order.
 *
 * The order detail (`GET /materials/orders/:folio`) returns it nested in
 * `local_field.local_field_id`; it does not send a top-level
 * `local_field_id`. Reading only the top-level field gave `undefined`, so
 * `GET /materials/config` went out without `local_field_id` and answered 400
 * for union, division and admin actors, who must name the field.
 */
export function orderLocalFieldId(
  orden: Pick<Orden, "local_field_id" | "local_field">,
): number | undefined {
  return orden.local_field?.local_field_id ?? orden.local_field_id ?? undefined;
}

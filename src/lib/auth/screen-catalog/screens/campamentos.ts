import {
  CAMPOREE_EVENT_TYPES_CREATE,
  CAMPOREE_EVENT_TYPES_DELETE,
  CAMPOREE_EVENT_TYPES_READ,
  CAMPOREE_EVENT_TYPES_UPDATE,
  CAMPOREE_EVENTS_CREATE,
  CAMPOREE_EVENTS_DELETE,
  CAMPOREE_EVENTS_READ,
  CAMPOREE_EVENTS_UPDATE,
  CAMPOREE_ORDERS_AUTHORIZE_WITHOUT_PROOF,
  CAMPOREE_ORDERS_CATALOG_MANAGE,
  CAMPOREE_ORDERS_DELIVER,
  CAMPOREE_ORDERS_OFFERING_CONFIGURE,
  CAMPOREE_ORDERS_READ,
  CAMPOREE_ORDERS_REVIEW,
  CAMPOREE_SUPPLIES_CONFIGURE,
  CAMPOREE_SUPPLIES_DELIVER,
  CAMPOREE_SUPPLIES_REVIEW_PAY,
  CAMPOREES_CREATE,
  CAMPOREES_DELETE,
  CAMPOREES_READ,
  CAMPOREES_UPDATE,
} from "@/lib/auth/permissions";

import type { ScreenCapability, ScreenDefinition } from "../types";
import { catalogEditorAccess } from "./_helpers";

/**
 * Camporee detail (local and union share endpoints and gates):
 *  - `camporees.controller.ts`: camporees:{create,update,delete}
 *  - `camporee-events.controller.ts`: camporee_events:{create,update,delete}
 *    (the API does NOT accept camporees:* for events — the old UI OR did)
 *  - `offerings.controller.ts`: camporee-orders:offering-configure
 *  - `camporee-supplies/{config,plans}.controller.ts`: camporee-supplies:*
 */
const CAMPOREE_DETAIL_CAPABILITIES: ScreenCapability[] = [
  { id: "create", kind: "button", gate: { permissions: [CAMPOREES_CREATE] } },
  { id: "update", kind: "button", gate: { permissions: [CAMPOREES_UPDATE] } },
  { id: "delete", kind: "button", gate: { permissions: [CAMPOREES_DELETE] } },
  {
    id: "events.create",
    kind: "button",
    gate: { permissions: [CAMPOREE_EVENTS_CREATE] },
  },
  {
    // Also judge roster/assignment writes (`camporee-scoring.controller.ts`).
    id: "events.update",
    kind: "button",
    gate: { permissions: [CAMPOREE_EVENTS_UPDATE] },
  },
  {
    id: "events.delete",
    kind: "button",
    gate: { permissions: [CAMPOREE_EVENTS_DELETE] },
  },
  {
    // camporee-venues.controller.ts:62 / :73 / :87
    id: "venues.create",
    kind: "button",
    gate: { permissions: [CAMPOREE_EVENTS_CREATE] },
  },
  {
    id: "venues.update",
    kind: "button",
    gate: { permissions: [CAMPOREE_EVENTS_UPDATE] },
  },
  {
    id: "venues.delete",
    kind: "button",
    gate: { permissions: [CAMPOREE_EVENTS_DELETE] },
  },
  {
    // GET scoring/leaderboard — camporee-scoring.controller.ts:79
    id: "scoring.read",
    kind: "section",
    gate: { permissions: [CAMPOREE_EVENTS_READ] },
  },
  {
    id: "orders.configure_offering",
    kind: "section",
    gate: { permissions: [CAMPOREE_ORDERS_OFFERING_CONFIGURE] },
  },
  {
    id: "supplies.configure",
    kind: "button",
    gate: { permissions: [CAMPOREE_SUPPLIES_CONFIGURE] },
  },
  {
    id: "supplies.review_pay",
    kind: "button",
    gate: { permissions: [CAMPOREE_SUPPLIES_REVIEW_PAY] },
  },
  {
    id: "supplies.deliver",
    kind: "button",
    gate: { permissions: [CAMPOREE_SUPPLIES_DELIVER] },
  },
];

/** `admin-camporee-event-types.controller.ts`: class @GlobalRoles('admin','super-admin'). */
const EVENT_TYPE_CAPABILITIES: ScreenCapability[] = [
  {
    id: "create",
    kind: "button",
    gate: catalogEditorAccess([CAMPOREE_EVENT_TYPES_CREATE]),
  },
  {
    id: "update",
    kind: "button",
    gate: catalogEditorAccess([CAMPOREE_EVENT_TYPES_UPDATE]),
  },
  {
    id: "delete",
    kind: "button",
    gate: catalogEditorAccess([CAMPOREE_EVENT_TYPES_DELETE]),
  },
];

/** Screen id for a camporee detail by kind (components rendered in both). */
export function camporeeScreenId(kind: "local" | "union" | undefined): string {
  return kind === "union" ? "campamentos-list-union" : "campamentos-list-local";
}

export const campamentosScreens: ScreenDefinition[] = [
  {
    id: "campamentos-list-local",
    surfaces: ["admin", "app"],
    viewAny: { permissions: [CAMPOREES_READ] },
    capabilities: CAMPOREE_DETAIL_CAPABILITIES,
  },
  {
    id: "campamentos-list-union",
    surfaces: ["admin"],
    viewAny: { permissions: [CAMPOREES_READ] },
    capabilities: CAMPOREE_DETAIL_CAPABILITIES,
  },
  {
    // `camporee-event-templates.controller.ts`
    id: "campamentos-plantillas",
    surfaces: ["admin"],
    viewAny: { permissions: [CAMPOREE_EVENTS_READ] },
    capabilities: [
      { id: "create", kind: "button", gate: { permissions: [CAMPOREE_EVENTS_CREATE] } },
      { id: "update", kind: "button", gate: { permissions: [CAMPOREE_EVENTS_UPDATE] } },
      { id: "delete", kind: "button", gate: { permissions: [CAMPOREE_EVENTS_DELETE] } },
    ],
  },
  {
    // `camporee-scoring.controller.ts`: judges GET = camporee_events:read,
    // candidates / POST / PATCH / DELETE = camporee_events:update.
    id: "campamentos-judges",
    surfaces: ["admin"],
    viewAny: { permissions: [CAMPOREE_EVENTS_READ] },
    capabilities: [
      { id: "manage", kind: "button", gate: { permissions: [CAMPOREE_EVENTS_UPDATE] } },
    ],
  },
  {
    // `camporee-orders/catalog.controller.ts`
    id: "campamentos-pedidos-catalogo",
    surfaces: ["admin"],
    viewAny: {
      permissions: [CAMPOREE_ORDERS_READ, CAMPOREE_ORDERS_CATALOG_MANAGE],
    },
    capabilities: [
      {
        id: "manage",
        kind: "button",
        gate: { permissions: [CAMPOREE_ORDERS_CATALOG_MANAGE] },
      },
    ],
  },
  {
    // `camporee-orders.controller.ts` — order detail verbs live here even when
    // the detail renders inside a camporee tab (same endpoints).
    id: "campamentos-pedidos-bandeja",
    surfaces: ["admin"],
    viewAny: { permissions: [CAMPOREE_ORDERS_REVIEW] },
    capabilities: [
      { id: "review", kind: "button", gate: { permissions: [CAMPOREE_ORDERS_REVIEW] } },
      {
        id: "authorize_without_proof",
        kind: "button",
        gate: { permissions: [CAMPOREE_ORDERS_AUTHORIZE_WITHOUT_PROOF] },
      },
      { id: "deliver", kind: "button", gate: { permissions: [CAMPOREE_ORDERS_DELIVER] } },
    ],
  },

  {
    id: "admin-campamentos-config-local",
    surfaces: ["admin"],
    viewAny: catalogEditorAccess([CAMPOREE_EVENT_TYPES_READ]),
    capabilities: EVENT_TYPE_CAPABILITIES,
  },
  {
    id: "admin-campamentos-config-union",
    surfaces: ["admin"],
    viewAny: catalogEditorAccess([CAMPOREE_EVENT_TYPES_READ]),
    capabilities: EVENT_TYPE_CAPABILITIES,
  },
];

export { EVENT_TYPE_CAPABILITIES as CAMPOREE_EVENT_TYPE_CAPABILITIES };

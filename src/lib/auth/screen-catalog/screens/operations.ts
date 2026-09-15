import {
  CAMPOREE_ORDERS_READ,
  CAMPOREE_SUPPLIES_READ,
  FIELD_PAYMENT_ORDERS_CONFIGURE,
  FIELD_PAYMENT_ORDERS_READ,
  FIELD_PAYMENT_ORDERS_REVIEW,
  FINANCES_CREATE,
  FINANCES_DELETE,
  FINANCES_READ,
  FINANCES_UPDATE,
  INSURANCE_CONFIGURE,
  INSURANCE_CREATE,
  INSURANCE_READ,
  INSURANCE_UPDATE,
  INVENTORY_CREATE,
  INVENTORY_DELETE,
  INVENTORY_READ,
  INVENTORY_UPDATE,
  MATERIALS_APPROVE,
  MATERIALS_DELIVER,
  MATERIALS_MANAGE_INVENTORY,
  MATERIALS_READ,
  MATERIALS_VALIDATE_RECEIPT,
  RESOURCE_CATEGORIES_CREATE,
  RESOURCE_CATEGORIES_DELETE,
  RESOURCE_CATEGORIES_READ,
  RESOURCE_CATEGORIES_UPDATE,
  RESOURCES_CREATE,
  RESOURCES_DELETE,
  RESOURCES_READ,
  RESOURCES_UPDATE,
} from "@/lib/auth/permissions";

import type { ScreenDefinition } from "../types";
import { roleOnlyAccess, viewOnlyScreen } from "./_helpers";

/**
 * Union of tab viewAny keys for `/dashboard/payment-orders`.
 * Hide tabs the actor cannot load; do not OR unrelated module reads into other pages.
 */
export const PAYMENT_ORDERS_PAGE_PERMISSIONS = [
  FIELD_PAYMENT_ORDERS_REVIEW,
  FIELD_PAYMENT_ORDERS_READ,
  CAMPOREE_ORDERS_READ,
  CAMPOREE_SUPPLIES_READ,
  MATERIALS_READ,
  INSURANCE_READ,
] as const;

export const operationsScreens: ScreenDefinition[] = [
  {
    id: "finances",
    surfaces: ["admin", "app"],
    // GET clubs/:clubId/finances, /transactions, /summary — finances.controller.ts:90,165,214
    viewAny: { permissions: [FINANCES_READ] },
    capabilities: [
      // POST clubs/:clubId/finances — finances.controller.ts:245-253
      // ClubRoles(director, deputy-director, treasurer, secretary-treasurer) is
      // club-assignment scoped, not @GlobalRoles — stays API-side.
      { id: "create", kind: "button", gate: { permissions: [FINANCES_CREATE] } },
      // PATCH finances/:financeId, POST finances/:financeId/evidences — L290,335
      { id: "update", kind: "button", gate: { permissions: [FINANCES_UPDATE] } },
      // DELETE finances/:financeId — finances.controller.ts:355
      { id: "delete", kind: "button", gate: { permissions: [FINANCES_DELETE] } },
    ],
  },
  {
    id: "club-inventory",
    surfaces: ["admin", "app"],
    // GET inventory/clubs/:clubId/inventory — inventory.controller.ts:52
    viewAny: { permissions: [INVENTORY_READ] },
    capabilities: [
      // POST inventory/clubs/:clubId/inventory — inventory.controller.ts:159
      { id: "create", kind: "button", gate: { permissions: [INVENTORY_CREATE] } },
      // PATCH inventory/:id, POST inventory/:id/evidences — L201,232
      { id: "update", kind: "button", gate: { permissions: [INVENTORY_UPDATE] } },
      // DELETE inventory/:id — inventory.controller.ts:289
      { id: "delete", kind: "button", gate: { permissions: [INVENTORY_DELETE] } },
    ],
  },

  {
    id: "insurance-by-section",
    surfaces: ["admin", "app"],
    // GET clubs/:clubId/sections/:sectionId/members/insurance — insurance.controller.ts:221
    viewAny: { permissions: [INSURANCE_READ] },
    capabilities: [
      // POST users/:memberId/insurance — insurance.controller.ts:319
      { id: "create", kind: "button", gate: { permissions: [INSURANCE_CREATE] } },
      // PATCH insurance/:insuranceId — insurance.controller.ts:368
      { id: "update", kind: "button", gate: { permissions: [INSURANCE_UPDATE] } },
      // Soft-delete: same PATCH with active=false (no insurance:delete in seed)
      { id: "delete", kind: "button", gate: { permissions: [INSURANCE_UPDATE] } },
    ],
  },
  // GET insurance/expiring — insurance.controller.ts:245-248
  // @GlobalRoles('admin','coordinator') + @SkipPermissions.
  // director-lf / assistant-lf enter via coordinator alias (not union/dia).
  viewOnlyScreen(
    "insurance-expiring",
    roleOnlyAccess(["admin", "coordinator"]),
  ),
  {
    id: "insurance-config",
    surfaces: ["admin"],
    // Hub: GET insurance/products (L76) OR GET payment-orders/config
    // (field-payment-orders.controller.ts:178).
    viewAny: {
      permissions: [INSURANCE_CONFIGURE, FIELD_PAYMENT_ORDERS_CONFIGURE],
    },
    capabilities: [
      // GET/POST/PATCH insurance/products and /cycles — insurance.controller.ts:76-195
      { id: "configure", kind: "tab", gate: { permissions: [INSURANCE_CONFIGURE] } },
      // GET/POST payment-orders/config — field-payment-orders.controller.ts:178,197
      {
        id: "configure_payment_instructions",
        kind: "tab",
        gate: { permissions: [FIELD_PAYMENT_ORDERS_CONFIGURE] },
      },
    ],
  },

  {
    id: "payment-orders",
    surfaces: ["admin"],
    viewAny: { permissions: [...PAYMENT_ORDERS_PAGE_PERMISSIONS] },
    capabilities: [
      {
        // Hub: GET /payment-obligations/pending —
        // payment-obligations.controller.ts:25-34 mode:'any'
        // (camporee-orders:read | camporee-supplies:read |
        // field-payment-orders:read | materiales:read).
        id: "pending",
        kind: "tab",
        gate: {
          permissions: [
            CAMPOREE_ORDERS_READ,
            CAMPOREE_SUPPLIES_READ,
            FIELD_PAYMENT_ORDERS_READ,
            MATERIALS_READ,
          ],
        },
      },
      {
        // Hub: GET list (field-payment-orders.controller.ts:135, :read)
        // OR GET review-queue (L149, :review).
        id: "orders",
        kind: "tab",
        gate: {
          permissions: [FIELD_PAYMENT_ORDERS_READ, FIELD_PAYMENT_ORDERS_REVIEW],
        },
      },
      {
        // GET reassignments — insurance-reassignments.controller.ts:54
        id: "reassignments",
        kind: "tab",
        gate: { permissions: [INSURANCE_READ] },
      },
    ],
  },

  // ─── Materiales — permission-only module (no @GlobalRoles), see
  // sacdia-backend/src/materials/*/*.controller.ts ────────────────────────────
  {
    id: "materials-inbox",
    surfaces: ["admin"],
    viewAny: { permissions: [MATERIALS_READ] },
    capabilities: [
      {
        id: "request_detail",
        kind: "route",
        href: "/dashboard/materials/request",
        gate: { permissions: [MATERIALS_READ] },
      },
      {
        // /dashboard/materials index and any non-leaf child.
        id: "hub",
        kind: "route",
        href: "/dashboard/materials",
        gate: { permissions: [MATERIALS_READ] },
      },
      // PATCH orders/:folio/lines/:lineId, POST orders/:folio/approve
      { id: "approve", kind: "button", gate: { permissions: [MATERIALS_APPROVE] } },
      // POST orders/:folio/deliver
      { id: "deliver", kind: "button", gate: { permissions: [MATERIALS_DELIVER] } },
    ],
  },
  {
    id: "materials-inventory",
    surfaces: ["admin"],
    viewAny: { permissions: [MATERIALS_MANAGE_INVENTORY] },
    capabilities: [
      // POST/PATCH/DELETE inventory, PATCH inventory/:id/variants/:variantId
      {
        id: "manage",
        kind: "button",
        gate: { permissions: [MATERIALS_MANAGE_INVENTORY] },
      },
    ],
  },
  {
    id: "materials-categories",
    surfaces: ["admin"],
    viewAny: { permissions: [MATERIALS_MANAGE_INVENTORY] },
    capabilities: [
      // POST/PATCH/DELETE categories
      {
        id: "manage",
        kind: "button",
        gate: { permissions: [MATERIALS_MANAGE_INVENTORY] },
      },
    ],
  },
  {
    id: "materials-receipts",
    surfaces: ["admin"],
    // Validation queue: the page is unusable without the verb, so the verb is
    // the entry gate (POST receipts/:folio/{approve,reject}).
    viewAny: { permissions: [MATERIALS_VALIDATE_RECEIPT] },
    capabilities: [
      {
        id: "validate",
        kind: "button",
        gate: { permissions: [MATERIALS_VALIDATE_RECEIPT] },
      },
    ],
  },

  {
    id: "resources-list",
    surfaces: ["admin", "app"],
    // resources.controller.ts — permission-only (no @GlobalRoles).
    // Territory recorte lives in resource-actions.ts, not this gate.
    viewAny: { permissions: [RESOURCES_READ] },
    capabilities: [
      { id: "create", kind: "button", gate: { permissions: [RESOURCES_CREATE] } },
      { id: "update", kind: "button", gate: { permissions: [RESOURCES_UPDATE] } },
      { id: "delete", kind: "button", gate: { permissions: [RESOURCES_DELETE] } },
    ],
  },
  {
    id: "resources-categories",
    surfaces: ["admin"],
    // resource-categories.controller.ts — permission-only, no @GlobalRoles.
    viewAny: { permissions: [RESOURCE_CATEGORIES_READ] },
    capabilities: [
      {
        id: "create",
        kind: "button",
        gate: { permissions: [RESOURCE_CATEGORIES_CREATE] },
      },
      {
        id: "update",
        kind: "button",
        gate: { permissions: [RESOURCE_CATEGORIES_UPDATE] },
      },
      {
        id: "delete",
        kind: "button",
        gate: { permissions: [RESOURCE_CATEGORIES_DELETE] },
      },
    ],
  },
];

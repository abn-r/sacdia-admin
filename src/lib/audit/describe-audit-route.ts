/**
 * Human labels for audit rows written by the backend's HTTP interceptor.
 *
 * That interceptor stores `summary = "<METHOD> <path>"` (ids that look like
 * tokens are replaced with `[REDACTED]`), `entity_type` = first path segment
 * (`admin`, `auth`, `annual-folders`...) and `entity_id` = the route's
 * deepest `*Id` param (`-` when the route has none). None of that is readable,
 * so the routes listed in `RULES` (data-driven: method + path pattern -> label
 * key + entity kind) are mapped to message keys here. Rows written by services
 * (richer summaries) or routes not listed fall through untouched (`null`) and
 * keep showing the raw values.
 */

export type AuditRouteKey =
  | "permissionCreated"
  | "permissionUpdated"
  | "permissionDeactivated"
  | "roleCreated"
  | "roleUpdated"
  | "roleDeactivated"
  | "rolePermissionsAdded"
  | "rolePermissionsReplaced"
  | "rolePermissionRemoved"
  | "userPermissionGranted"
  | "userPermissionRemoved"
  | "userRoleAssigned"
  | "userRoleRemoved"
  | "adminBootstrapped"
  | "sessionLogin"
  | "sessionLogout"
  | "contextChanged"
  | "legalAccepted"
  | "folderTemplateCreated"
  | "folderTemplateUpdated"
  | "folderTemplateCopied"
  | "folderTemplateDeleted"
  | "templateSectionAdded"
  | "templateSectionUpdated"
  | "templateSectionDeleted"
  | "folderSubmitted"
  | "folderClosed"
  | "folderSectionSubmitted"
  | "folderSectionEvaluated"
  | "folderSectionReopened"
  | "folderSectionUnionConfirmed"
  | "evidenceUploaded"
  | "achievementCreated"
  | "achievementUpdated"
  | "achievementDeactivated"
  | "achievementAwardedRetroactively"
  | "achievementCategoryCreated"
  | "achievementCategoryUpdated"
  | "achievementCategoryDeactivated"
  | "awardCategoryCreated"
  | "awardCategoryUpdated"
  | "awardCategoryDeactivated"
  | "financeCreated"
  | "financeUpdated"
  | "financeDeleted"
  | "activityCreated"
  | "activityUpdated"
  | "activityDeleted"
  | "investitureRequestCreated"
  | "investiturePersonAdded"
  | "investiturePersonRemoved"
  | "investitureDatesUpdated"
  | "investitureRequestResolved"
  | "classEnrolled"
  | "classProgressUpdated"
  | "classSectionSubmitted"
  | "certificateBatchCreated"
  | "certificateBatchOcrStarted"
  | "certificateBatchSubmitted"
  | "certificateBatchDeleted"
  | "certificateItemAdded"
  | "certificateItemUpdated"
  | "certificateItemDeleted"
  | "certificateItemResubmitted"
  | "certificateBatchApproved"
  | "certificateBatchRejected"
  | "certificateItemApproved"
  | "certificateItemRejected"
  | "institutionalRequestCreated"
  | "institutionalRequestApproved"
  | "institutionalRequestRejected"
  | "honorProposalCreated"
  | "honorProposalWithdrawn"
  | "honorProposalApproved"
  | "honorProposalRejected"
  | "camporeeOrderCreated"
  | "camporeeOrderProofUploaded"
  | "camporeeOrderCancelled"
  | "camporeeOrderApproved"
  | "camporeeOrderRejected"
  | "camporeeOrderAuthorizedWithoutProof"
  | "camporeeOrderDelivered"
  | "camporeeOrderLineDelivered"
  | "supplyPlanSaved"
  | "supplyPlanSubmitted"
  | "supplyPlanLinesUpdated"
  | "supplyDeliveryRegistered"
  | "supplyPaymentMarkedPaid"
  | "monthlyReportCreated"
  | "monthlyReportGenerated"
  | "monthlyReportRegenerated"
  | "monthlyReportManualDataUpdated"
  | "monthlyReportSubmitted";

/** What `entity_id` points at for that route (the id the interceptor recorded). */
export type AuditEntityKind =
  | "role"
  | "permission"
  | "user"
  | "session"
  | "club"
  | "clubSection"
  | "folder"
  | "folderTemplate"
  | "templateSection"
  | "folderSection"
  | "enrollment"
  | "achievement"
  | "achievementCategory"
  | "awardCategory"
  | "finance"
  | "activity"
  | "investitureRequest"
  | "investiturePerson"
  | "class"
  | "classSection"
  | "certificateBatch"
  | "certificateItem"
  | "institutionalRequest"
  | "honor"
  | "honorProposal"
  | "camporee"
  | "camporeeOrder"
  | "camporeeOrderLine"
  | "supplyLine"
  | "supplyPayment"
  | "monthlyReport";

export type AuditRouteInfo = {
  routeKey: AuditRouteKey;
  entityKind: AuditEntityKind;
  /** DELETE that only deactivates the record: show "Desactivado", not "Eliminado". */
  softDelete: boolean;
  /** Replaces the CRUD action badge (session events are not "Creado"). */
  action?: AuditActionOverride;
};

export type AuditActionOverride = "LOGIN" | "LOGOUT";

type Rule = {
  methods: readonly string[];
  /** Segments after `api/v1`; `:x` matches any single segment. */
  paths: readonly string[];
  info: AuditRouteInfo;
};

type RuleOptions = { softDelete?: boolean; action?: AuditActionOverride };

const rule = (
  methods: readonly string[],
  path: string | readonly string[],
  routeKey: AuditRouteKey,
  entityKind: AuditEntityKind,
  { softDelete = false, action }: RuleOptions = {},
): Rule => ({
  methods,
  paths: typeof path === "string" ? [path] : path,
  info: { routeKey, entityKind, softDelete, ...(action ? { action } : {}) },
});

const RULES: readonly Rule[] = [
  rule(["POST"], "admin/rbac/permissions", "permissionCreated", "permission"),
  rule(["PATCH", "PUT"], "admin/rbac/permissions/:id", "permissionUpdated", "permission"),
  rule(["DELETE"], "admin/rbac/permissions/:id", "permissionDeactivated", "permission", { softDelete: true }),
  rule(["POST"], "admin/rbac/roles", "roleCreated", "role"),
  rule(["PATCH", "PUT"], "admin/rbac/roles/:id", "roleUpdated", "role"),
  rule(["DELETE"], "admin/rbac/roles/:id", "roleDeactivated", "role", { softDelete: true }),
  rule(["POST"], "admin/rbac/roles/:id/permissions", "rolePermissionsAdded", "role"),
  rule(["PUT"], "admin/rbac/roles/:id/permissions", "rolePermissionsReplaced", "role"),
  rule(["DELETE"], "admin/rbac/roles/:id/permissions/:permissionId", "rolePermissionRemoved", "role"),
  rule(["POST"], "admin/rbac/users/:userId/permissions", "userPermissionGranted", "user"),
  rule(["DELETE"], "admin/rbac/users/:userId/permissions/:permissionId", "userPermissionRemoved", "permission"),
  rule(["POST"], "admin/rbac/users/:userId/roles", "userRoleAssigned", "user"),
  rule(["DELETE"], "admin/rbac/users/:userId/roles/:roleId", "userRoleRemoved", "role"),
  rule(["POST"], "admin/rbac/bootstrap-admin", "adminBootstrapped", "user"),
  rule(["POST"], "auth/login", "sessionLogin", "session", { action: "LOGIN" }),
  rule(["POST"], "auth/logout", "sessionLogout", "session", { action: "LOGOUT" }),
  rule(["PATCH"], "auth/me/context", "contextChanged", "session"),
  rule(["POST"], "users/me/legal-acceptance", "legalAccepted", "user"),
  rule(["POST"], "annual-folders/templates", "folderTemplateCreated", "folderTemplate"),
  rule(["PATCH", "PUT"], "annual-folders/templates/:templateId", "folderTemplateUpdated", "folderTemplate"),
  rule(["POST"], "annual-folders/templates/:templateId/copy", "folderTemplateCopied", "folderTemplate"),
  rule(["DELETE"], "annual-folders/templates/:templateId", "folderTemplateDeleted", "folderTemplate"),
  rule(["POST"], "annual-folders/templates/:templateId/sections", "templateSectionAdded", "folderTemplate"),
  rule(["PATCH", "PUT"], "annual-folders/templates/sections/:sectionId", "templateSectionUpdated", "templateSection"),
  rule(["DELETE"], "annual-folders/templates/sections/:sectionId", "templateSectionDeleted", "templateSection"),
  rule(["POST"], "annual-folders/:folderId/submit", "folderSubmitted", "folder"),
  rule(["POST"], "annual-folders/:folderId/close", "folderClosed", "folder"),
  rule(["POST"], "annual-folders/:folderId/sections/:sectionId/submit", "folderSectionSubmitted", "folderSection"),
  rule(["POST"], "annual-folders/:folderId/sections/:sectionId/evaluate", "folderSectionEvaluated", "folderSection"),
  rule(["POST"], "annual-folders/:folderId/sections/:sectionId/reopen", "folderSectionReopened", "folderSection"),
  rule(["POST"], "annual-folders/:folderId/sections/:sectionId/confirm-union", "folderSectionUnionConfirmed", "folderSection"),
  rule(["POST"], "annual-folders/:folderId/sections/:sectionId/evidences", "evidenceUploaded", "folderSection"),
  rule(["POST"], "admin/achievements", "achievementCreated", "achievement"),
  rule(["PATCH", "PUT"], "admin/achievements/:achievementId", "achievementUpdated", "achievement"),
  rule(["DELETE"], "admin/achievements/:achievementId", "achievementDeactivated", "achievement", { softDelete: true }),
  rule(["POST"], "admin/achievements/retroactive/:achievementId", "achievementAwardedRetroactively", "achievement"),
  rule(["POST"], "admin/achievements/categories", "achievementCategoryCreated", "achievementCategory"),
  rule(["PATCH", "PUT"], "admin/achievements/categories/:categoryId", "achievementCategoryUpdated", "achievementCategory"),
  rule(["DELETE"], "admin/achievements/categories/:categoryId", "achievementCategoryDeactivated", "achievementCategory", { softDelete: true }),
  rule(["POST"], "award-categories", "awardCategoryCreated", "awardCategory"),
  rule(["PATCH", "PUT"], "award-categories/:categoryId", "awardCategoryUpdated", "awardCategory"),
  rule(["DELETE"], "award-categories/:categoryId", "awardCategoryDeactivated", "awardCategory", { softDelete: true }),
  rule(["POST"], "clubs/:clubId/finances", "financeCreated", "club"),
  rule(["PATCH", "PUT"], "finances/:financeId", "financeUpdated", "finance"),
  rule(["DELETE"], "finances/:financeId", "financeDeleted", "finance"),
  rule(["POST"], "clubs/:clubId/activities", "activityCreated", "club"),
  rule(["PATCH", "PUT"], "activities/:activityId", "activityUpdated", "activity"),
  rule(["DELETE"], "activities/:activityId", "activityDeleted", "activity"),
  rule(["POST"], "club-sections/:sectionId/investiture-requests", "investitureRequestCreated", "clubSection"),
  rule(["POST"], "investiture-requests/:requestId/people", "investiturePersonAdded", "investitureRequest"),
  rule(["DELETE"], "investiture-requests/:requestId/people/:personId", "investiturePersonRemoved", "investiturePerson"),
  rule(["PATCH", "PUT"], "investiture-requests/:requestId/dates", "investitureDatesUpdated", "investitureRequest"),
  rule(["POST"], "investiture-requests/:requestId/resolutions", "investitureRequestResolved", "investitureRequest"),
  rule(["POST"], "users/:userId/classes/enroll", "classEnrolled", "user"),
  rule(["PATCH", "PUT"], "users/:userId/classes/:classId/progress", "classProgressUpdated", "class"),
  rule(["POST"], "users/:userId/classes/:classId/sections/:sectionId/submit", "classSectionSubmitted", "classSection"),
  rule(["POST"], "certificate-bulk-imports", "certificateBatchCreated", "certificateBatch"),
  rule(["POST"], "certificate-bulk-imports/:batchId/process-ocr", "certificateBatchOcrStarted", "certificateBatch"),
  rule(["POST"], "certificate-bulk-imports/:batchId/submit", "certificateBatchSubmitted", "certificateBatch"),
  rule(["DELETE"], "certificate-bulk-imports/:batchId", "certificateBatchDeleted", "certificateBatch"),
  rule(["POST"], "certificate-bulk-imports/:batchId/items", "certificateItemAdded", "certificateBatch"),
  rule(["PATCH", "PUT"], "certificate-bulk-imports/:batchId/items/:itemId", "certificateItemUpdated", "certificateItem"),
  rule(["DELETE"], "certificate-bulk-imports/:batchId/items/:itemId", "certificateItemDeleted", "certificateItem"),
  rule(["POST"], "certificate-bulk-imports/:batchId/items/:itemId/resubmit", "certificateItemResubmitted", "certificateItem"),
  rule(["POST"], "admin/certificate-bulk-imports/:batchId/approve", "certificateBatchApproved", "certificateBatch"),
  rule(["POST"], "admin/certificate-bulk-imports/:batchId/reject", "certificateBatchRejected", "certificateBatch"),
  rule(["POST"], "admin/certificate-bulk-imports/:batchId/items/:itemId/approve", "certificateItemApproved", "certificateItem"),
  rule(["POST"], "admin/certificate-bulk-imports/:batchId/items/:itemId/reject", "certificateItemRejected", "certificateItem"),
  rule(["POST"], "certificate-import-institutional-requests", "institutionalRequestCreated", "institutionalRequest"),
  rule(["POST"], "admin/certificate-import-institutional-requests/:requestId/approve", "institutionalRequestApproved", "institutionalRequest"),
  rule(["POST"], "admin/certificate-import-institutional-requests/:requestId/reject", "institutionalRequestRejected", "institutionalRequest"),
  rule(["POST"], "users/:userId/honors/:honorId/instructor-proposal", "honorProposalCreated", "honor"),
  rule(["DELETE"], "users/:userId/honors/:honorId/instructor-proposal", "honorProposalWithdrawn", "honor"),
  rule(["POST"], "admin/honor-instructor-proposals/:proposalId/approve", "honorProposalApproved", "honorProposal"),
  rule(["POST"], "admin/honor-instructor-proposals/:proposalId/reject", "honorProposalRejected", "honorProposal"),
  rule(["POST"], ["camporees/:camporeeId/orders", "union-camporees/:camporeeId/orders"], "camporeeOrderCreated", "camporee"),
  rule(["POST"], "camporee-orders/:orderId/proof", "camporeeOrderProofUploaded", "camporeeOrder"),
  rule(["POST"], "camporee-orders/:orderId/cancel", "camporeeOrderCancelled", "camporeeOrder"),
  rule(["POST"], "camporee-orders/:orderId/approve", "camporeeOrderApproved", "camporeeOrder"),
  rule(["POST"], "camporee-orders/:orderId/reject", "camporeeOrderRejected", "camporeeOrder"),
  rule(["POST"], "camporee-orders/:orderId/authorize-without-proof", "camporeeOrderAuthorizedWithoutProof", "camporeeOrder"),
  rule(["POST"], "camporee-orders/:orderId/deliver", "camporeeOrderDelivered", "camporeeOrder"),
  rule(["POST"], "camporee-orders/:orderId/lines/:lineId/deliver-to-member", "camporeeOrderLineDelivered", "camporeeOrderLine"),
  rule(["PUT", "PATCH"], ["camporees/:camporeeId/supply-plan", "union-camporees/:camporeeId/supply-plan"], "supplyPlanSaved", "camporee"),
  rule(["POST"], ["camporees/:camporeeId/supply-plan/submit", "union-camporees/:camporeeId/supply-plan/submit"], "supplyPlanSubmitted", "camporee"),
  rule(["PATCH", "PUT"], ["camporees/:camporeeId/supply-plan/lines", "union-camporees/:camporeeId/supply-plan/lines"], "supplyPlanLinesUpdated", "camporee"),
  rule(["POST"], ["camporees/:camporeeId/supply-lines/:lineId/deliveries", "union-camporees/:camporeeId/supply-lines/:lineId/deliveries"], "supplyDeliveryRegistered", "supplyLine"),
  rule(["POST"], "camporee-supply-payments/:paymentId/mark-paid", "supplyPaymentMarkedPaid", "supplyPayment"),
  rule(["POST"], "monthly-reports/:enrollmentId", "monthlyReportCreated", "enrollment"),
  rule(["POST"], "monthly-reports/:reportId/generate", "monthlyReportGenerated", "monthlyReport"),
  rule(["POST"], "monthly-reports/:reportId/regenerate", "monthlyReportRegenerated", "monthlyReport"),
  rule(["PATCH", "PUT"], "monthly-reports/:reportId/manual-data", "monthlyReportManualDataUpdated", "monthlyReport"),
  rule(["POST"], "monthly-reports/:reportId/submit", "monthlyReportSubmitted", "monthlyReport"),
];

const SUMMARY_PATTERN = /^([A-Z]+)\s+(\S+)$/;

function routeSegments(path: string): string[] {
  return (path.split("?")[0] ?? "")
    .split("/")
    .filter(Boolean)
    .filter((segment, index) => !(index === 0 && segment === "api") && !/^v\d+$/.test(segment));
}

function matches(pattern: string, segments: string[]): boolean {
  const expected = pattern.split("/");
  return (
    expected.length === segments.length &&
    expected.every((part, index) => part.startsWith(":") || part === segments[index])
  );
}

/**
 * `method`/`path` come from `request_context` when the detail was loaded;
 * otherwise they are parsed out of the list row's `summary`.
 */
export function describeAuditRoute(input: {
  summary?: string | null;
  request_context?: Record<string, unknown> | null;
}): AuditRouteInfo | null {
  let method: string | null = null;
  let path: string | null = null;

  const parsed = input.summary ? SUMMARY_PATTERN.exec(input.summary.trim()) : null;
  if (parsed) {
    method = parsed[1] ?? null;
    path = parsed[2] ?? null;
  } else if (input.request_context) {
    const { method: ctxMethod, path: ctxPath } = input.request_context;
    if (typeof ctxMethod === "string" && typeof ctxPath === "string") {
      method = ctxMethod.toUpperCase();
      path = ctxPath;
    }
  }
  if (!method || !path) return null;

  const segments = routeSegments(path);
  const found = RULES.find(
    (candidate) => candidate.methods.includes(method) &&
      candidate.paths.some((path) => matches(path, segments)),
  );
  return found ? found.info : null;
}

/** `-` is what the backend records when the route carries no id param. */
export function hasAuditEntityId(id: string | null | undefined): id is string {
  const trimmed = (id ?? "").trim();
  return trimmed !== "" && trimmed !== "-";
}

/** First 8 characters of a UUID-ish id, enough to tell rows apart in a list. */
export function shortAuditId(id: string): string {
  const trimmed = id.trim();
  return trimmed.length > 8 ? `${trimmed.slice(0, 8)}…` : trimmed;
}

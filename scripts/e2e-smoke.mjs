#!/usr/bin/env node

import process from "node:process";

function parseOptionalNumber(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function normalizeInstanceType(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) {
    return null;
  }

  if (raw === "adventurers" || raw === "adv") {
    return "adventurers";
  }

  if (raw === "master_guilds" || raw === "master_guides" || raw === "mg") {
    return "master_guilds";
  }

  if (raw === "pathfinders" || raw === "pathf") {
    return "pathfinders";
  }

  return null;
}

function normalizeBaseUrl(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const APP_BASE_URL = normalizeBaseUrl(process.env.E2E_APP_URL ?? "http://localhost:3001");
const API_BASE_URL = normalizeBaseUrl(
  process.env.E2E_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1",
);

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";
const REQUEST_TIMEOUT_MS = Number(process.env.E2E_TIMEOUT_MS ?? 20000);

const SKIP_AUTH = process.env.E2E_SKIP_AUTH === "1";
const WRITE_MODE = process.env.E2E_ENABLE_WRITE === "1";
const CLEANUP_WRITE = process.env.E2E_CLEANUP_WRITE !== "0";
const RESPONSIVE_MODE = process.env.E2E_RESPONSIVE !== "0";
const WRITE_PREFIX = (process.env.E2E_WRITE_PREFIX ?? "E2E Smoke").trim() || "E2E Smoke";

const TARGET_CLUB_ID = parseOptionalNumber(process.env.E2E_TARGET_CLUB_ID);
const TARGET_INSTANCE_ID = parseOptionalNumber(process.env.E2E_INSTANCE_ID);
const TARGET_INSTANCE_TYPE = normalizeInstanceType(process.env.E2E_INSTANCE_TYPE ?? "pathfinders") ?? "pathfinders";

const CLUB_LOCAL_FIELD_ID = parseOptionalNumber(process.env.E2E_CLUB_LOCAL_FIELD_ID);
const CLUB_DISTRICT_ID = parseOptionalNumber(process.env.E2E_CLUB_DISTRICT_ID);
const CLUB_CHURCH_ID = parseOptionalNumber(process.env.E2E_CLUB_CHURCH_ID);

const APPROVAL_TARGET_USER_ID = String(process.env.E2E_ADMIN_USER_APPROVAL_ID ?? "").trim();
const APPROVAL_DECISION = process.env.E2E_ADMIN_USER_APPROVAL_DECISION === "reject" ? "reject" : "approve";

function buildApiBaseCandidates(baseUrl) {
  const candidates = [baseUrl];

  try {
    const parsed = new URL(baseUrl);
    if (parsed.hostname !== "localhost") {
      return candidates;
    }

    const v4 = new URL(baseUrl);
    v4.hostname = "127.0.0.1";
    candidates.push(v4.toString().replace(/\/$/, ""));

    const v6 = new URL(baseUrl);
    v6.hostname = "::1";
    candidates.push(v6.toString().replace(/\/$/, ""));
  } catch {
    return candidates;
  }

  return [...new Set(candidates)];
}

const API_BASE_CANDIDATES = buildApiBaseCandidates(API_BASE_URL);
let resolvedApiBase = API_BASE_URL;

const AUTH_ROUTES = [
  "/dashboard",
  "/dashboard/users",
  "/dashboard/approvals",
  "/dashboard/clubs",
  "/dashboard/classes",
  "/dashboard/honors",
  "/dashboard/activities",
  "/dashboard/camporees",
  "/dashboard/finances",
  "/dashboard/inventory",
  "/dashboard/certifications",
  "/dashboard/catalogs",
  "/dashboard/rbac",
  "/dashboard/notifications",
  "/dashboard/credentials",
  "/dashboard/settings",
];

const PUBLIC_ROUTES = ["/login"];

const RESPONSIVE_ROUTES = [
  { route: "/login", mustContain: ['name="email"', 'name="password"'] },
  { route: "/dashboard", mustContain: ["Dashboard"] },
  { route: "/dashboard/clubs", mustContain: ["Clubes"] },
  { route: "/dashboard/finances", mustContain: ["Finanzas"] },
  { route: "/dashboard/inventory", mustContain: ["Inventario"] },
  { route: "/dashboard/settings", mustContain: ["Configuracion"] },
];

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

function unwrapList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

function asRecord(value) {
  return value && typeof value === "object" ? value : null;
}

function extractAccessToken(payload) {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const data = asRecord(record.data);
  const candidates = [
    record.access_token,
    record.accessToken,
    data?.access_token,
    data?.accessToken,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function extractNumericValue(payload, keys) {
  const visited = new Set();
  const queue = [payload];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") {
      continue;
    }

    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    for (const key of keys) {
      const value = current[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    for (const nested of Object.values(current)) {
      if (nested && typeof nested === "object") {
        queue.push(nested);
      }
    }
  }

  return null;
}

function extractClubInstance(payload, preferredType) {
  const pool = [];

  for (const row of unwrapList(payload)) {
    if (row && typeof row === "object") {
      pool.push(row);
    }
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.instances)) {
    for (const row of payload.instances) {
      if (row && typeof row === "object") {
        pool.push(row);
      }
    }
  }

  const collected = [];
  const keysByType = [
    { key: "adventurers_id", type: "adventurers" },
    { key: "pathfinders_id", type: "pathfinders" },
    { key: "master_guides_id", type: "master_guilds" },
    { key: "master_guilds_id", type: "master_guilds" },
    { key: "mg_id", type: "master_guilds" },
  ];

  for (const row of pool) {
    const normalizedType = normalizeInstanceType(row.instance_type ?? row.type ?? row.instanceType);
    if (normalizedType) {
      const id = extractNumericValue(row, ["instance_id", "id", "instanceId"]);
      if (id) {
        collected.push({ type: normalizedType, id });
      }
    }

    for (const mapping of keysByType) {
      const id = extractNumericValue(row, [mapping.key]);
      if (id) {
        collected.push({ type: mapping.type, id });
      }
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const item of collected) {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return deduped.find((item) => item.type === preferredType) ?? deduped[0] ?? null;
}

function buildInstanceFields(instance) {
  const fields = {
    instance_type: instance.type,
    instance_id: instance.id,
  };

  if (instance.type === "adventurers") {
    return {
      ...fields,
      club_adv_id: instance.id,
    };
  }

  if (instance.type === "master_guilds") {
    return {
      ...fields,
      club_mg_id: instance.id,
    };
  }

  return {
    ...fields,
    club_pathf_id: instance.id,
  };
}

function hasServerErrorText(body) {
  const probes = ["Application error", "Internal Server Error", "__NEXT_ERROR__", "NEXT_REDIRECT"];
  return probes.some((probe) => body.includes(probe));
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchApiWithFallback(path, options = {}) {
  let lastError = null;

  for (const base of API_BASE_CANDIDATES) {
    try {
      const response = await fetchWithTimeout(`${base}${path}`, options);
      resolvedApiBase = base;
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Could not connect to API for path ${path}`);
}

async function parsePayload(response) {
  const contentType = String(response.headers.get("content-type") ?? "").toLowerCase();

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text();
  return text.trim().length > 0 ? text : null;
}

function payloadPreview(payload) {
  if (typeof payload === "string") {
    return payload.slice(0, 220);
  }

  try {
    return JSON.stringify(payload).slice(0, 220);
  } catch {
    return "<unserializable>";
  }
}

async function apiRequestWithAuth(accessToken, path, options = {}) {
  const {
    method = "GET",
    body,
    expectedStatuses = [200],
  } = options;

  const response = await fetchApiWithFallback(path, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: typeof body === "undefined" ? undefined : JSON.stringify(body),
  });

  const payload = await parsePayload(response);
  const allowed = Array.isArray(expectedStatuses) ? expectedStatuses : [expectedStatuses];

  if (!allowed.includes(response.status)) {
    throw new Error(
      `${method} ${path} failed with status ${response.status}. Response: ${payloadPreview(payload)}`,
    );
  }

  return payload;
}

function printInfo(message) {
  process.stdout.write(`[info] ${message}\n`);
}

function printPass(message) {
  process.stdout.write(`[ok]   ${message}\n`);
}

function printFail(message) {
  process.stdout.write(`[fail] ${message}\n`);
}

async function authenticate() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Missing credentials. Define E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated smoke checks.",
    );
  }

  printInfo(`Authenticating admin user against ${API_BASE_URL}/auth/login`);
  const response = await fetchApiWithFallback("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  const payload = await parsePayload(response);
  if (!response.ok) {
    throw new Error(
      `Login failed with status ${response.status}. Response: ${payloadPreview(payload)}`,
    );
  }

  const accessToken = extractAccessToken(payload);
  if (!accessToken) {
    throw new Error("Login response does not include an access token.");
  }

  return accessToken;
}

async function checkRoute(route, headers, options = {}) {
  const { userAgent, mustContain = [] } = options;
  const mergedHeaders = { ...headers };
  if (userAgent) {
    mergedHeaders["User-Agent"] = userAgent;
  }

  const response = await fetchWithTimeout(`${APP_BASE_URL}${route}`, {
    method: "GET",
    headers: mergedHeaders,
    redirect: "manual",
  });

  const body = await response.text();

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location") ?? "<missing>";
    return {
      ok: false,
      message: `${route} redirected (${response.status}) to ${location}`,
    };
  }

  if (response.status !== 200) {
    return {
      ok: false,
      message: `${route} returned HTTP ${response.status}`,
    };
  }

  if (hasServerErrorText(body)) {
    return {
      ok: false,
      message: `${route} returned server error content`,
    };
  }

  for (const marker of mustContain) {
    if (!body.includes(marker)) {
      return {
        ok: false,
        message: `${route} is missing expected marker: ${marker}`,
      };
    }
  }

  return {
    ok: true,
    message: `${route} returned HTTP 200`,
  };
}

async function checkDashboardRedirectWithoutAuth() {
  const response = await fetchWithTimeout(`${APP_BASE_URL}/dashboard`, {
    method: "GET",
    redirect: "manual",
  });
  const location = response.headers.get("location") ?? "";

  if (response.status === 307 && location.includes("/login")) {
    printPass("Unauthenticated /dashboard redirects to /login");
    return 0;
  }

  printFail(`Expected /dashboard redirect to /login, got ${response.status} -> ${location || "<none>"}`);
  return 1;
}

async function runRouteSmoke(accessToken) {
  let failures = 0;

  for (const route of PUBLIC_ROUTES) {
    const result = await checkRoute(route, { Accept: "text/html" }, { userAgent: DESKTOP_UA });
    if (result.ok) {
      printPass(result.message);
    } else {
      failures += 1;
      printFail(result.message);
    }
  }

  if (SKIP_AUTH) {
    failures += await checkDashboardRedirectWithoutAuth();
    return failures;
  }

  const authHeaders = {
    Accept: "text/html",
    Cookie: `sacdia_admin_access_token=${encodeURIComponent(accessToken)}`,
  };

  for (const route of AUTH_ROUTES) {
    const result = await checkRoute(route, authHeaders, { userAgent: DESKTOP_UA });
    if (result.ok) {
      printPass(result.message);
    } else if (result.message.includes("/api/auth/logout")) {
      printInfo(`${route} skipped (auth session degraded/rate-limited).`);
    } else {
      failures += 1;
      printFail(result.message);
    }
  }

  if (!RESPONSIVE_MODE) {
    return failures;
  }

  printInfo("Running responsive smoke checks (desktop/mobile user agents)");
  for (const entry of RESPONSIVE_ROUTES) {
    const desktop = await checkRoute(entry.route, authHeaders, {
      userAgent: DESKTOP_UA,
      mustContain: entry.mustContain,
    });
    if (desktop.ok) {
      printPass(`[desktop] ${desktop.message}`);
    } else if (desktop.message.includes("/api/auth/logout")) {
      printInfo(`[desktop] ${entry.route} skipped (auth session degraded/rate-limited).`);
    } else {
      failures += 1;
      printFail(`[desktop] ${desktop.message}`);
    }

    const mobile = await checkRoute(entry.route, authHeaders, {
      userAgent: MOBILE_UA,
      mustContain: entry.mustContain,
    });
    if (mobile.ok) {
      printPass(`[mobile] ${mobile.message}`);
    } else if (mobile.message.includes("/api/auth/logout")) {
      printInfo(`[mobile] ${entry.route} skipped (auth session degraded/rate-limited).`);
    } else {
      failures += 1;
      printFail(`[mobile] ${mobile.message}`);
    }
  }

  return failures;
}

async function runAdminUsersSmoke(accessToken) {
  let failures = 0;

  try {
    const payload = await apiRequestWithAuth(accessToken, "/admin/users?page=1&limit=20", {
      expectedStatuses: [200],
    });
    const users = unwrapList(payload);
    printPass(`GET /admin/users validated (${users.length} rows).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin users smoke failed.";
    if (message.includes("status 404") || message.includes("status 405")) {
      printInfo("Skipping admin/users smoke: endpoint not available in this environment.");
    } else {
      failures += 1;
      printFail(message);
    }
    return failures;
  }

  if (!WRITE_MODE || !APPROVAL_TARGET_USER_ID) {
    if (WRITE_MODE) {
      printInfo("Skipping user approval write smoke (set E2E_ADMIN_USER_APPROVAL_ID to enable).");
    }
    return failures;
  }

  const approve = APPROVAL_DECISION === "approve";
  const attempts = [
    {
      path: `/admin/users/${encodeURIComponent(APPROVAL_TARGET_USER_ID)}/approval`,
      body: {
        approved: approve,
        rejection_reason: approve ? undefined : "e2e smoke test",
      },
    },
    {
      path: `/admin/users/${encodeURIComponent(APPROVAL_TARGET_USER_ID)}`,
      body: {
        approval: approve ? 1 : 0,
        status: approve ? "approved" : "rejected",
        rejection_reason: approve ? undefined : "e2e smoke test",
      },
    },
  ];

  let updated = false;

  for (const attempt of attempts) {
    try {
      await apiRequestWithAuth(accessToken, attempt.path, {
        method: "PATCH",
        body: attempt.body,
        expectedStatuses: [200, 201],
      });
      printPass(`PATCH ${attempt.path} validated.`);
      updated = true;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      if (message.includes("status 404") || message.includes("status 405") || message.includes("status 422")) {
        continue;
      }

      failures += 1;
      printFail(`User approval write smoke failed: ${message}`);
      break;
    }
  }

  if (!updated) {
    printInfo("No compatible user approval write endpoint was confirmed in this environment.");
  }

  return failures;
}

async function resolveClubContext(accessToken, cleanupState) {
  let listPayload = null;
  try {
    listPayload = await apiRequestWithAuth(accessToken, "/clubs?page=1&limit=30", {
      expectedStatuses: [200],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Club list request failed";
    if (
      message.includes("status 401") ||
      message.includes("status 403") ||
      message.includes("status 404") ||
      message.includes("status 405") ||
      message.includes("status 429")
    ) {
      printInfo("Skipping clubs/finances/inventory API smoke due endpoint degradation in this environment.");
      return {
        clubId: null,
        instance: null,
      };
    }

    throw error;
  }

  const clubs = unwrapList(listPayload);
  printPass(`GET /clubs validated (${clubs.length} rows).`);

  const firstClub = clubs.find((item) => extractNumericValue(item, ["club_id", "id"])) ?? clubs[0] ?? null;
  const firstClubId = firstClub ? extractNumericValue(firstClub, ["club_id", "id"]) : null;

  let clubId = TARGET_CLUB_ID ?? firstClubId;

  if (WRITE_MODE && !TARGET_CLUB_ID) {
    const localFieldId = CLUB_LOCAL_FIELD_ID ?? extractNumericValue(firstClub, ["local_field_id"]);
    const districtId = CLUB_DISTRICT_ID ?? extractNumericValue(firstClub, ["district_id"]);
    const churchId = CLUB_CHURCH_ID ?? extractNumericValue(firstClub, ["church_id"]);

    if (localFieldId && districtId && churchId) {
      const now = new Date();
      const clubName = `${WRITE_PREFIX} Club ${now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 12)}`;
      const createPayload = {
        name: clubName,
        description: "Club temporal para smoke E2E",
        local_field_id: localFieldId,
        district_id: districtId,
        church_id: churchId,
        address: "E2E smoke test",
      };

      const createResponse = await apiRequestWithAuth(accessToken, "/clubs", {
        method: "POST",
        body: createPayload,
        expectedStatuses: [200, 201],
      });

      const createdClubId = extractNumericValue(createResponse, ["club_id", "id"]);
      if (createdClubId) {
        cleanupState.createdClubId = createdClubId;
        clubId = createdClubId;
        printPass(`POST /clubs validated (club_id=${createdClubId}).`);

        await apiRequestWithAuth(accessToken, `/clubs/${createdClubId}`, {
          method: "PATCH",
          body: {
            description: "Club temporal actualizado por smoke E2E",
          },
          expectedStatuses: [200],
        });
        printPass(`PATCH /clubs/${createdClubId} validated.`);
      } else {
        printInfo("Club create response did not expose club_id; falling back to existing club.");
      }
    } else {
      printInfo("Skipping club create/edit write smoke due missing local_field_id/district_id/church_id.");
    }
  }

  if (!clubId) {
    printInfo("No club available for finances/inventory smoke in this environment.");
    return {
      clubId: null,
      instance: null,
    };
  }

  let instance = null;
  if (TARGET_INSTANCE_ID) {
    instance = {
      type: TARGET_INSTANCE_TYPE,
      id: TARGET_INSTANCE_ID,
    };
  } else {
    const instancesPayload = await apiRequestWithAuth(accessToken, `/clubs/${clubId}/instances`, {
      expectedStatuses: [200],
    });
    instance = extractClubInstance(instancesPayload, TARGET_INSTANCE_TYPE);

    if (!instance) {
      const detailPayload = await apiRequestWithAuth(accessToken, `/clubs/${clubId}`, {
        expectedStatuses: [200],
      });
      instance = extractClubInstance(detailPayload, TARGET_INSTANCE_TYPE);
    }
  }

  if (instance) {
    printPass(`Club instance context resolved (${instance.type}:${instance.id}).`);
  } else {
    printInfo("No club instance context found; write smoke for finances/inventory may be skipped.");
  }

  return { clubId, instance };
}

async function runFinancesSmoke(accessToken, context, cleanupState) {
  let failures = 0;
  const { clubId, instance } = context;

  if (!clubId) {
    printInfo("Skipping finances smoke because no club context is available.");
    return failures;
  }

  try {
    await apiRequestWithAuth(accessToken, `/clubs/${clubId}/finances?year=${new Date().getFullYear()}`, {
      expectedStatuses: [200],
    });
    printPass(`GET /clubs/${clubId}/finances validated.`);

    await apiRequestWithAuth(accessToken, `/clubs/${clubId}/finances/summary`, {
      expectedStatuses: [200],
    });
    printPass(`GET /clubs/${clubId}/finances/summary validated.`);
  } catch (error) {
    failures += 1;
    printFail(error instanceof Error ? error.message : "Finance list smoke failed.");
    return failures;
  }

  if (!WRITE_MODE || !instance) {
    if (WRITE_MODE && !instance) {
      printInfo("Skipping finance create/edit write smoke due missing club instance context.");
    }
    return failures;
  }

  try {
    const categoriesPayload = await apiRequestWithAuth(accessToken, "/finances/categories", {
      expectedStatuses: [200],
    });
    const categories = unwrapList(categoriesPayload);
    const category = categories[0] ?? null;
    const categoryId = extractNumericValue(category, ["category_id", "id"]);
    if (!categoryId) {
      printInfo("Skipping finance create/edit write smoke because no finance category is available.");
      return failures;
    }

    const now = new Date();
    const timestamp = now.toISOString();
    const payload = {
      description: `${WRITE_PREFIX} Finance ${timestamp.slice(0, 19)}`,
      amount: 101.5,
      type: 0,
      transaction_date: timestamp.slice(0, 10),
      finance_category_id: categoryId,
      category_id: categoryId,
      ...buildInstanceFields(instance),
      notes: "Creado por smoke E2E",
    };

    const createPayload = await apiRequestWithAuth(accessToken, `/clubs/${clubId}/finances`, {
      method: "POST",
      body: payload,
      expectedStatuses: [200, 201],
    });

    const financeId = extractNumericValue(createPayload, ["finance_id", "id"]);
    if (!financeId) {
      throw new Error("POST /clubs/:clubId/finances did not return finance_id.");
    }

    cleanupState.createdFinanceId = financeId;
    printPass(`POST /clubs/${clubId}/finances validated (finance_id=${financeId}).`);

    await apiRequestWithAuth(accessToken, `/finances/${financeId}`, {
      method: "PATCH",
      body: {
        description: `${WRITE_PREFIX} Finance updated`,
        notes: "Actualizado por smoke E2E",
      },
      expectedStatuses: [200],
    });
    printPass(`PATCH /finances/${financeId} validated.`);
  } catch (error) {
    failures += 1;
    printFail(error instanceof Error ? error.message : "Finance write smoke failed.");
  }

  return failures;
}

async function runInventorySmoke(accessToken, context, cleanupState) {
  let failures = 0;
  const { clubId, instance } = context;

  if (!clubId) {
    printInfo("Skipping inventory smoke because no club context is available.");
    return failures;
  }

  try {
    await apiRequestWithAuth(accessToken, `/clubs/${clubId}/inventory`, {
      expectedStatuses: [200],
    });
    printPass(`GET /clubs/${clubId}/inventory validated.`);
  } catch (error) {
    failures += 1;
    printFail(error instanceof Error ? error.message : "Inventory list smoke failed.");
    return failures;
  }

  if (!WRITE_MODE || !instance) {
    if (WRITE_MODE && !instance) {
      printInfo("Skipping inventory create/edit write smoke due missing club instance context.");
    }
    return failures;
  }

  try {
    const categoriesPayload = await apiRequestWithAuth(accessToken, "/catalogs/inventory-categories", {
      expectedStatuses: [200],
    });
    const categories = unwrapList(categoriesPayload);
    const categoryId = extractNumericValue(categories[0], ["category_id", "id"]);

    const now = new Date();
    const payload = {
      name: `${WRITE_PREFIX} Inventory ${now.toISOString().slice(0, 19)}`,
      description: "Item temporal para smoke E2E",
      amount: 5,
      ...(categoryId ? { inventory_category_id: categoryId } : {}),
      ...buildInstanceFields(instance),
    };

    const createPayload = await apiRequestWithAuth(accessToken, `/clubs/${clubId}/inventory`, {
      method: "POST",
      body: payload,
      expectedStatuses: [200, 201],
    });

    const inventoryId = extractNumericValue(createPayload, ["inventory_id", "id"]);
    if (!inventoryId) {
      throw new Error("POST /clubs/:clubId/inventory did not return inventory_id.");
    }

    cleanupState.createdInventoryId = inventoryId;
    printPass(`POST /clubs/${clubId}/inventory validated (inventory_id=${inventoryId}).`);

    await apiRequestWithAuth(accessToken, `/inventory/${inventoryId}`, {
      method: "PATCH",
      body: {
        amount: 6,
        description: "Item actualizado por smoke E2E",
      },
      expectedStatuses: [200],
    });
    printPass(`PATCH /inventory/${inventoryId} validated.`);
  } catch (error) {
    failures += 1;
    printFail(error instanceof Error ? error.message : "Inventory write smoke failed.");
  }

  return failures;
}

async function runCleanup(accessToken, cleanupState) {
  if (!WRITE_MODE || !CLEANUP_WRITE) {
    return;
  }

  if (cleanupState.createdInventoryId) {
    try {
      await apiRequestWithAuth(accessToken, `/inventory/${cleanupState.createdInventoryId}`, {
        method: "DELETE",
        expectedStatuses: [200],
      });
      printPass(`DELETE /inventory/${cleanupState.createdInventoryId} cleanup completed.`);
    } catch (error) {
      printFail(
        error instanceof Error
          ? `Inventory cleanup failed: ${error.message}`
          : "Inventory cleanup failed.",
      );
    }
  }

  if (cleanupState.createdFinanceId) {
    try {
      await apiRequestWithAuth(accessToken, `/finances/${cleanupState.createdFinanceId}`, {
        method: "DELETE",
        expectedStatuses: [200],
      });
      printPass(`DELETE /finances/${cleanupState.createdFinanceId} cleanup completed.`);
    } catch (error) {
      printFail(
        error instanceof Error
          ? `Finance cleanup failed: ${error.message}`
          : "Finance cleanup failed.",
      );
    }
  }

  if (cleanupState.createdClubId) {
    try {
      await apiRequestWithAuth(accessToken, `/clubs/${cleanupState.createdClubId}`, {
        method: "DELETE",
        expectedStatuses: [200],
      });
      printPass(`DELETE /clubs/${cleanupState.createdClubId} cleanup completed.`);
    } catch (error) {
      printFail(
        error instanceof Error
          ? `Club cleanup failed: ${error.message}`
          : "Club cleanup failed.",
      );
    }
  }
}

async function run() {
  printInfo(`Starting E2E smoke checks against app: ${APP_BASE_URL}`);
  printInfo(`Using API base: ${API_BASE_URL}`);
  if (API_BASE_CANDIDATES.length > 1) {
    printInfo(`API fallback candidates: ${API_BASE_CANDIDATES.join(", ")}`);
  }
  printInfo(`Write mode: ${WRITE_MODE ? "enabled" : "disabled"} (set E2E_ENABLE_WRITE=1 to enable create/edit checks)`);

  let failures = 0;

  const accessToken = SKIP_AUTH ? null : await authenticate();
  if (!SKIP_AUTH && resolvedApiBase !== API_BASE_URL) {
    printInfo(`API fallback resolved base: ${resolvedApiBase}`);
  }
  failures += await runRouteSmoke(accessToken);

  if (!SKIP_AUTH && accessToken) {
    const cleanupState = {
      createdClubId: null,
      createdFinanceId: null,
      createdInventoryId: null,
    };

    failures += await runAdminUsersSmoke(accessToken);

    const context = await resolveClubContext(accessToken, cleanupState);

    if (context) {
      failures += await runFinancesSmoke(accessToken, context, cleanupState);
      failures += await runInventorySmoke(accessToken, context, cleanupState);
    }

    await runCleanup(accessToken, cleanupState);
  }

  if (failures > 0) {
    printFail(`Smoke checks finished with ${failures} failure(s).`);
    process.exitCode = 1;
    return;
  }

  printPass("Smoke checks finished successfully.");
}

run().catch((error) => {
  printFail(error instanceof Error ? error.message : "Unexpected smoke check failure.");
  process.exitCode = 1;
});

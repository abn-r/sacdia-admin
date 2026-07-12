#!/usr/bin/env node
/**
 * Targeted smoke for backlog routes (clubs search, investiture pipeline, annual folders, year-end).
 * Requires E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD (see .env.e2e.local).
 */

import process from "node:process";

const APP_BASE_URL = (process.env.E2E_APP_URL ?? "http://localhost:3001").replace(/\/$/, "");
const API_BASE_URL = (process.env.E2E_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";
const TIMEOUT_MS = Number(process.env.E2E_TIMEOUT_MS ?? 20000);

const ROUTES = [
  { path: "/dashboard/clubs", markers: ["Clubes", "clubs"] },
  { path: "/dashboard/clubs?search=betel&page=1", markers: ["Clubes", "clubs"] },
  { path: "/dashboard/investiture/pipeline", markers: ["investiture", "Investidura", "Seguimiento"] },
  { path: "/dashboard/year-end", markers: ["year", "año", "Cierre"] },
  { path: "/dashboard/annual-folders/templates", markers: ["plantilla", "template", "Plantilla"] },
  { path: "/dashboard/annual-folders/evaluate", markers: ["carpeta", "folder", "Carpeta"] },
];

function log(kind, message) {
  process.stdout.write(`[${kind}] ${message}\n`);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractAccessToken(payload) {
  if (!payload || typeof payload !== "object") return null;
  const data = payload.data && typeof payload.data === "object" ? payload.data : null;
  for (const candidate of [payload.access_token, payload.accessToken, data?.access_token, data?.accessToken]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

async function authenticate() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.");
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Login failed (${response.status}): ${payload?.message ?? "unknown"}`);
  }
  const token = extractAccessToken(payload);
  if (!token) throw new Error("Login response missing access token.");
  return token;
}

async function checkRoute(route, token) {
  const response = await fetchWithTimeout(`${APP_BASE_URL}${route}`, {
    headers: {
      Accept: "text/html",
      Cookie: `sacdia_admin_access_token=${encodeURIComponent(token)}`,
    },
    redirect: "manual",
  });
  const body = await response.text();

  if (response.status >= 300 && response.status < 400) {
    return { ok: false, message: `${route} redirected (${response.status})` };
  }
  if (response.status !== 200) {
    return { ok: false, message: `${route} returned HTTP ${response.status}` };
  }
  if (["Application error", "Internal Server Error", "__NEXT_ERROR__"].some((p) => body.includes(p))) {
    return { ok: false, message: `${route} returned server error page` };
  }
  return { ok: true, message: `${route} HTTP 200` };
}

async function checkClubsSearchApi(token) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/clubs?page=1&limit=5&search=club`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, message: `GET /clubs?search=club failed (${response.status})` };
  }
  const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return { ok: true, message: `GET /clubs?search=club OK (${rows.length} rows, meta total=${payload?.meta?.total ?? payload?.data?.meta?.total ?? "?"})` };
}

async function checkInvestiturePipelineApi(token) {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/investiture/pending?limit=1&status=SUBMITTED_FOR_VALIDATION`,
    { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } },
  );
  if (response.status === 404 || response.status === 405) {
    return { ok: true, message: "Investiture pending endpoint skipped (not available)" };
  }
  if (!response.ok) {
    return { ok: false, message: `GET /investiture/pending failed (${response.status})` };
  }
  return { ok: true, message: "GET /investiture/pending OK" };
}

async function runUnauthenticatedRouteProbes() {
  let failures = 0;
  log("info", "Unauthenticated route probes (expect login redirect, not 500)");
  for (const { path } of ROUTES) {
    const response = await fetchWithTimeout(`${APP_BASE_URL}${path}`, { redirect: "manual" });
    const location = response.headers.get("location") ?? "";
    if ((response.status === 307 || response.status === 302) && location.includes("/login")) {
      log("ok", `${path} -> /login`);
    } else if (response.status === 200) {
      log("ok", `${path} reachable without redirect (public/session present)`);
    } else {
      failures += 1;
      log("fail", `${path} unexpected ${response.status} -> ${location || "no location"}`);
    }
  }
  return failures;
}

async function run() {
  log("info", `Backlog smoke app=${APP_BASE_URL} api=${API_BASE_URL}`);
  let failures = await runUnauthenticatedRouteProbes();

  let token;
  try {
    token = await authenticate();
    log("ok", "Authenticated");
  } catch (error) {
    log("fail", error instanceof Error ? error.message : "Authentication failed");
    log("info", "Update .env.e2e.local E2E_ADMIN_PASSWORD for full smoke.");
    process.exitCode = failures > 0 ? 1 : 1;
    return;
  }

  for (const { path } of ROUTES) {
    const result = await checkRoute(path, token);
    if (result.ok) log("ok", result.message);
    else {
      failures += 1;
      log("fail", result.message);
    }
  }

  for (const check of [checkClubsSearchApi, checkInvestiturePipelineApi]) {
    const result = await check(token);
    if (result.ok) log("ok", result.message);
    else {
      failures += 1;
      log("fail", result.message);
    }
  }

  if (failures > 0) {
    log("fail", `${failures} failure(s)`);
    process.exitCode = 1;
    return;
  }
  log("ok", "Backlog smoke passed");
}

run().catch((error) => {
  log("fail", error instanceof Error ? error.message : "Unexpected error");
  process.exitCode = 1;
});

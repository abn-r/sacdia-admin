#!/usr/bin/env node
/**
 * Smoke: v1/v2 route parity + HTTP health (no auth required for redirect checks).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = (process.env.E2E_APP_URL ?? "http://localhost:3001").replace(/\/$/, "");
const TIMEOUT = Number(process.env.E2E_TIMEOUT_MS ?? 15000);

const KEY_ROUTES = [
  "/dashboard",
  "/dashboard/users",
  "/dashboard/clubs",
  "/dashboard/catalogs",
  "/dashboard/catalogs/geography/countries",
  "/dashboard/catalogs/club-ideals",
  "/dashboard/evidence-review",
  "/dashboard/investiture",
  "/dashboard/rbac/roles",
  "/dashboard/settings",
];

function toV2Path(v1) {
  if (v1 === "/dashboard") return "/v2/dashboard";
  if (v1.startsWith("/dashboard/")) return `/v2/dashboard${v1.slice("/dashboard".length)}`;
  return `/v2/dashboard${v1}`;
}

function collectV2Pages(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectV2Pages(full, acc);
    } else if (entry.name === "page.tsx") {
      acc.push(full);
    }
  }
  return acc;
}

async function fetchRoute(route) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${APP}${route}`, {
      redirect: "manual",
      headers: { Accept: "text/html" },
      signal: controller.signal,
    });
    const body = await res.text();
    return { status: res.status, location: res.headers.get("location"), body };
  } finally {
    clearTimeout(timer);
  }
}

function isHealthy({ status, body }) {
  if (status >= 500) return false;
  if (body.includes("Application error") || body.includes("Internal Server Error")) return false;
  return true;
}

let failures = 0;
const pass = (m) => process.stdout.write(`[ok]   ${m}\n`);
const fail = (m) => {
  process.stdout.write(`[fail] ${m}\n`);
  failures += 1;
};
const info = (m) => process.stdout.write(`[info] ${m}\n`);

// 1) v2 page files exist
const v2Root = path.join(ROOT, "src/app/(dashboard-v2)/v2/dashboard");
const v2Pages = collectV2Pages(v2Root);
pass(`Found ${v2Pages.length} v2 page.tsx files`);

// 2) route-map parity for key routes
for (const v1 of KEY_ROUTES) {
  const v2 = toV2Path(v1);
  const rel = v2.replace("/v2/dashboard", "") || "";
  const expected = path.join(v2Root, rel, "page.tsx");
  if (!fs.existsSync(expected)) {
    fail(`Missing v2 page for ${v1} → ${v2}`);
  } else {
    pass(`Parity ${v1} ↔ ${v2}`);
  }
}

// 3) HTTP health — expect 200 (login) or 307/308 redirect to login for protected
info(`HTTP checks against ${APP}`);
for (const v1 of KEY_ROUTES) {
  const v2 = toV2Path(v1);
  for (const route of [v1, v2]) {
    try {
      const res = await fetchRoute(route);
      if (!isHealthy(res)) {
        fail(`${route} unhealthy (HTTP ${res.status})`);
        continue;
      }
      const okRedirect =
        (res.status === 307 || res.status === 308 || res.status === 302) &&
        (res.location?.includes("/login") ?? false);
      if (res.status === 200 || okRedirect) {
        pass(`${route} → HTTP ${res.status}${res.location ? ` (${res.location})` : ""}`);
      } else {
        fail(`${route} unexpected HTTP ${res.status} → ${res.location ?? "no location"}`);
      }
    } catch (e) {
      fail(`${route} fetch error: ${e instanceof Error ? e.message : e}`);
    }
  }
}

// 4) no V2ContentFrame in v2 pages
let bridgeCount = 0;
for (const page of v2Pages) {
  const src = fs.readFileSync(page, "utf8");
  if (src.includes("V2ContentFrame")) bridgeCount += 1;
}
if (bridgeCount > 0) {
  fail(`${bridgeCount} v2 pages still use V2ContentFrame`);
} else {
  pass("0 v2 pages use V2ContentFrame");
}

// 5) toggle links in studio shell
try {
  const login = await fetchRoute("/login");
  if (login.body.includes("/v2/dashboard") || login.body.includes("v2")) {
    pass("Login page references v2 toggle/path");
  } else {
    info("Login page v2 toggle not detected in HTML (may be client-rendered)");
  }
} catch (e) {
  fail(`Login fetch: ${e instanceof Error ? e.message : e}`);
}

if (failures > 0) {
  fail(`Finished with ${failures} failure(s)`);
  process.exitCode = 1;
} else {
  pass("v1/v2 navigation smoke passed");
}

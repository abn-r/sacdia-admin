import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const FORBIDDEN = [
  /\/investiture\/pending/,
  /submit-for-validation/,
  /\/investiture\/enrollments\//,
  /\/admin\/investiture\/config/,
  /\/enrollments\/\$\{[^}]+\}\/(validate|investiture|investiture-history)["'`]/,
  /getPendingValidations\(\{\s*entity_type:\s*"class"/,
  /<ValidationQueuePanel\s+entityType="class"/,
  /\/dashboard\/enrollments(?![\w-])/, // pantalla borrada en A2: ningún enlace, atajo ni botón vuelve a ella
];

function isForbidden(line: string): boolean {
  return FORBIDDEN.some((pattern) => pattern.test(line));
}

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("fase 8 — el panel no llama la vía anterior", () => {
  it("no source file calls a retired endpoint", () => {
    const offenders: string[] = [];
    for (const path of files(SRC)) {
      readFileSync(path, "utf8")
        .split("\n")
        .forEach((line, index) => {
          if (isForbidden(line)) {
            offenders.push(`${relative(SRC, path)}:${index + 1}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });
});

describe("fase 8 — cada patrón prohibido detecta un ejemplo real", () => {
  it.each([
    ["/investiture/pending", 'apiRequest("/investiture/pending")'],
    ["submit-for-validation", "`/enrollments/1/submit-for-validation`"],
    ["/investiture/enrollments/", "`/investiture/enrollments/${id}/club-approve`"],
    ["/admin/investiture/config", 'apiRequest("/admin/investiture/config")'],
    ["validate", "`/enrollments/${enrollmentId}/validate`"],
    ["investiture", "`/enrollments/${enrollmentId}/investiture`"],
    ["investiture-history", "`/enrollments/${enrollmentId}/investiture-history`"],
    [
      "getPendingValidations de clase",
      'getPendingValidations({ entity_type: "class" })',
    ],
    ["panel de cola de clase", '<ValidationQueuePanel entityType="class" />'],
    ["/dashboard/enrollments", 'href="/dashboard/enrollments"'],
    ["/dashboard/enrollments?x", 'href="/dashboard/enrollments?status=open"'],
  ])("flags %s", (_label, line) => {
    expect(isForbidden(line)).toBe(true);
  });

  it.each([
    'apiRequest("/investiture-requests")',
    'href="/dashboard/enrollments-report"',
    "`/enrollments/${id}/progress`",
    'getPendingValidations({ entity_type: "honor" })',
    '<ValidationQueuePanel entityType="honor" />',
  ])("does not flag %s", (line) => {
    expect(isForbidden(line)).toBe(false);
  });
});

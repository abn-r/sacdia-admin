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
          if (FORBIDDEN.some((pattern) => pattern.test(line))) {
            offenders.push(`${relative(SRC, path)}:${index + 1}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });
});

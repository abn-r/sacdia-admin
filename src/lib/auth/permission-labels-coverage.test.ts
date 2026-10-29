import { describe, expect, it } from "vitest";

import enMessages from "../../../messages/en.json";
import esMessages from "../../../messages/es.json";
import frMessages from "../../../messages/fr.json";
import ptBRMessages from "../../../messages/pt-BR.json";
import { SEEDED_PERMISSION_KEYS } from "./seeded-permission-keys";

const locales = [
  ["es", esMessages],
  ["en", enMessages],
  ["fr", frMessages],
  ["pt-BR", ptBRMessages],
] as const;

describe("seeded permission labels", () => {
  it("lists each seeded permission key once", () => {
    expect(new Set(SEEDED_PERMISSION_KEYS).size).toBe(
      SEEDED_PERMISSION_KEYS.length,
    );
  });

  it.each(locales)(
    "%s has a readable rbac.permissions label for every seeded key",
    (_locale, messages) => {
      const labels = messages.rbac.permissions as Record<string, string>;
      const missing = SEEDED_PERMISSION_KEYS.filter((key) => {
        const label = labels[key];
        return !label || label.trim() === "" || label === key;
      });

      expect(missing).toEqual([]);
    },
  );
});

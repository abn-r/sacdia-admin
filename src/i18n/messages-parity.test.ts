import { describe, expect, it } from "vitest";

import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";
import frMessages from "../../messages/fr.json";
import ptBRMessages from "../../messages/pt-BR.json";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

const baseKeys = new Set(flattenKeys(esMessages));

const targetLocales = [
  ["en", enMessages],
  ["fr", frMessages],
  ["pt-BR", ptBRMessages],
] as const;

describe("locale message parity with es.json", () => {
  it.each(targetLocales)("%s has every key present in es.json", (_locale, messages) => {
    const localeKeys = new Set(flattenKeys(messages));
    const missing = [...baseKeys].filter((key) => !localeKeys.has(key));

    expect(missing).toEqual([]);
  });

  it.each(targetLocales)("%s has no keys absent from es.json", (_locale, messages) => {
    const extra = flattenKeys(messages).filter((key) => !baseKeys.has(key));

    expect(extra).toEqual([]);
  });
});

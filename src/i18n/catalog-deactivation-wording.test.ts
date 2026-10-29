import { describe, expect, it } from "vitest";

import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";
import frMessages from "../../messages/fr.json";
import ptBRMessages from "../../messages/pt-BR.json";

// Every catalog DELETE in the backend only sets active=false (phase-E catalogs,
// geography, club types/ideals, honor categories, honors). The shared catalog copy
// must say "desactivar", never promise a permanent deletion.
const HARD_DELETE_WORDS = {
  es: /elimin/i,
  en: /\bdelet/i,
  fr: /supprim/i,
  "pt-BR": /exclu|apag/i,
} as const;

const locales = [
  ["es", esMessages],
  ["en", enMessages],
  ["fr", frMessages],
  ["pt-BR", ptBRMessages],
] as const;

function pick(messages: typeof esMessages): Record<string, string> {
  const c = messages.catalogs;
  return {
    "crudPage.deleteRecord": c.crudPage.deleteRecord,
    "crudPage.delete": c.crudPage.delete,
    "crudPage.deleteItem": c.crudPage.deleteItem,
    "deleteDialog.title": c.deleteDialog.title,
    "deleteDialog.description": c.deleteDialog.description,
    "deleteDialog.delete": c.deleteDialog.delete,
    "deleteDialog.deleting": c.deleteDialog.deleting,
    "success.op_delete_title": c.success.op_delete_title,
    "success.op_delete_description": c.success.op_delete_description,
    "errors.op_delete_failed": c.errors.op_delete_failed,
    "validation.delete_target_not_identified": c.validation.delete_target_not_identified,
    "phaseE.deleteDialogTitle": c.phaseE.deleteDialogTitle,
    "phaseE.deleteDialogDesc": c.phaseE.deleteDialogDesc,
    "phaseE.delete": c.phaseE.delete,
  };
}

describe("catalog deactivation wording", () => {
  it.each(locales)("%s does not describe the soft delete as a deletion", (locale, messages) => {
    const offenders = Object.entries(pick(messages as typeof esMessages))
      .filter(([, text]) => HARD_DELETE_WORDS[locale].test(text))
      .map(([key, text]) => `${key}: ${text}`);

    expect(offenders).toEqual([]);
  });
});

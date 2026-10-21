import { describe, it, expect } from "vitest";
import enMessages from "../../../messages/en.json";
import esMessages from "../../../messages/es.json";
import frMessages from "../../../messages/fr.json";
import ptMessages from "../../../messages/pt-BR.json";
import {
  CRON_JOB_LABEL_KEYS,
  CRON_JOB_NAMES,
  getCronJobLabelKey,
} from "./cron-jobs";

const locales = {
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  "pt-BR": ptMessages,
};

describe("cron-jobs", () => {
  it("knows all 20 scheduled jobs", () => {
    expect(CRON_JOB_NAMES).toHaveLength(20);
    expect(new Set(Object.values(CRON_JOB_LABEL_KEYS)).size).toBe(20);
  });

  it("resolves a label key for known jobs and undefined for unknown ones", () => {
    expect(getCronJobLabelKey("dependent-profiles-purge")).toBe("jobDependentProfilesPurge");
    expect(getCronJobLabelKey("brand-new-job")).toBeUndefined();
    expect(getCronJobLabelKey("toString")).toBeUndefined();
  });

  it.each(Object.entries(locales))("has a label for every job in %s", (_locale, messages) => {
    const labels = messages.system_jobs.cronRuns as Record<string, string>;
    for (const key of Object.values(CRON_JOB_LABEL_KEYS)) {
      expect(labels[key], key).toBeTruthy();
    }
  });
});

import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import esMessages from "../../../messages/es.json";
import enMessages from "../../../messages/en.json";
import ptBrMessages from "../../../messages/pt-BR.json";
import frMessages from "../../../messages/fr.json";
import {
  INVESTITURE_REQUEST_ERROR_KEYS,
  getInvestitureRequestErrorCode,
  getInvestitureRequestErrorMessage,
  getInvestitureRequestErrorMessageByCode,
} from "./investiture-request-errors";

const t = (key: string) => `t:${key}`;

function apiErrorWithCode(code: string, status = 409) {
  return new ApiError("raw backend message", status, { code, message: "raw backend message" });
}

describe("getInvestitureRequestErrorMessage", () => {
  it("maps a known code to its translation key", () => {
    expect(
      getInvestitureRequestErrorMessage(apiErrorWithCode("INVESTITURE_REQUEST_WINDOW_CLOSED"), t),
    ).toBe("t:errors.window_closed");
  });

  it("uses an authorizer-specific text for a closed window in the resolve context only", () => {
    const error = apiErrorWithCode("INVESTITURE_REQUEST_WINDOW_CLOSED");
    expect(getInvestitureRequestErrorMessage(error, t, { context: "resolve" })).toBe(
      "t:errors.window_closed_authorize",
    );
    expect(getInvestitureRequestErrorMessage(error, t)).toBe("t:errors.window_closed");
  });

  it("keeps the regular mapping for other codes in the resolve context", () => {
    expect(
      getInvestitureRequestErrorMessage(apiErrorWithCode("INVESTITURE_REQUEST_YEAR_CLOSED"), t, {
        context: "resolve",
      }),
    ).toBe("t:errors.year_closed");
  });

  it("reads the code from nested error payloads", () => {
    const error = new ApiError("x", 409, { error: { code: "INVESTITURE_PASTOR_QUOTA_FULL" } });
    expect(getInvestitureRequestErrorMessage(error, t)).toBe("t:errors.pastor_quota_full");
  });

  it("returns the backend message for an unknown code", () => {
    expect(getInvestitureRequestErrorMessage(apiErrorWithCode("SOMETHING_ELSE", 400), t)).toBe(
      "raw backend message",
    );
  });

  it("returns the backend message for validation errors without a code", () => {
    const error = new ApiError("minimum_percent must not be greater than 100", 400, {
      message: ["minimum_percent must not be greater than 100"],
    });
    expect(getInvestitureRequestErrorMessage(error, t)).toBe(
      "minimum_percent must not be greater than 100",
    );
  });

  it("falls back to the forbidden text for 401/403 without a known code", () => {
    expect(getInvestitureRequestErrorMessage(new ApiError("", 403, null), t)).toBe(
      "t:errors.forbidden",
    );
  });

  it("falls back to the generic text for non-API errors", () => {
    expect(getInvestitureRequestErrorMessage(new Error("boom"), t)).toBe("t:errors.generic");
  });

  it("exposes the code and a by-code resolver for partial results", () => {
    expect(getInvestitureRequestErrorCode(apiErrorWithCode("INVESTITURE_REQUEST_YEAR_CLOSED"))).toBe(
      "INVESTITURE_REQUEST_YEAR_CLOSED",
    );
    expect(getInvestitureRequestErrorCode(new Error("x"))).toBeNull();
    expect(getInvestitureRequestErrorMessageByCode("INVESTITURE_REQUEST_DATE_OUTSIDE_WINDOW", t)).toBe(
      "t:errors.date_outside_window",
    );
    expect(getInvestitureRequestErrorMessageByCode("NOPE", t)).toBe("t:errors.generic");
  });
});

describe("investiture request error catalog", () => {
  it("covers every flow code prefix", () => {
    const codes = Object.keys(INVESTITURE_REQUEST_ERROR_KEYS);
    for (const prefix of [
      "INVESTITURE_REQUEST_",
      "INVESTITURE_WINDOW_",
      "CLASS_THRESHOLD_",
      "INVESTITURE_PASTOR_",
      "INVESTITURE_DURATION_",
    ]) {
      expect(codes.some((code) => code.startsWith(prefix))).toBe(true);
    }
    expect(codes).toContain("INVESTITURE_REQUEST_ALREADY_RESOLVED");
    expect(codes).toContain("INVESTITURE_DURATION_MIN_NOT_MET");
  });

  it.each([
    ["es", esMessages],
    ["en", enMessages],
    ["pt-BR", ptBrMessages],
    ["fr", frMessages],
  ])("has a non-empty translation for every key in %s", (_locale, messages) => {
    const errors = (messages as unknown as { investiture_requests: { errors: Record<string, string> } })
      .investiture_requests.errors;
    const keys = [
      ...Object.values(INVESTITURE_REQUEST_ERROR_KEYS).map((key) => key.replace("errors.", "")),
      "forbidden",
      "generic",
      "window_closed_authorize",
    ];
    for (const key of keys) {
      expect(errors[key], key).toBeTruthy();
    }
  });
});

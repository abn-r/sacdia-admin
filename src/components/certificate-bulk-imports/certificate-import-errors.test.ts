import { describe, expect, it } from "vitest";
import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import {
  getCertificateImportErrorCode,
  getCertificateImportErrorMessage,
  isCertificateImportInlineError,
} from "./certificate-import-errors";

const t = (key: "authorization_pending" | "ended_year_field_forbidden") =>
  messages.certificate_bulk_imports.errors[key];

function apiError(code: string, message = "backend text") {
  return new ApiError(message, 409, { code });
}

describe("certificate import errors", () => {
  it("explains a pending investiture authorization in plain Spanish", () => {
    expect(
      getCertificateImportErrorMessage(apiError("CERTIFICATE_IMPORT_AUTHORIZATION_PENDING"), t, "fallback"),
    ).toBe(
      "La persona tiene una solicitud de investidura pendiente en este año. Primero se resuelve la autorización.",
    );
  });

  it("explains who can credit a certificate of an ended year", () => {
    expect(
      getCertificateImportErrorMessage(
        apiError("CERTIFICATE_IMPORT_ENDED_YEAR_FIELD_FORBIDDEN"),
        t,
        "fallback",
      ),
    ).toBe("Solo el Campo de la solicitud o la administración pueden acreditar este certificado.");
  });

  it("keeps the backend message for any other API error", () => {
    expect(getCertificateImportErrorMessage(apiError("SOMETHING_ELSE", "Texto del backend"), t, "fallback")).toBe(
      "Texto del backend",
    );
  });

  it("falls back for errors that are not API errors", () => {
    expect(getCertificateImportErrorMessage(new Error("boom"), t, "No se pudo completar la acción")).toBe(
      "No se pudo completar la acción",
    );
  });

  it("reads the code from the payload shapes the API uses", () => {
    expect(getCertificateImportErrorCode(new ApiError("x", 409, { error: { code: "A" } }))).toBe("A");
    expect(getCertificateImportErrorCode(new ApiError("x", 409, { errors: { code: "B" } }))).toBe("B");
    expect(getCertificateImportErrorCode(new Error("x"))).toBeNull();
  });

  it("flags only the authorization-pending error for an inline banner", () => {
    expect(isCertificateImportInlineError(apiError("CERTIFICATE_IMPORT_AUTHORIZATION_PENDING"))).toBe(true);
    expect(isCertificateImportInlineError(apiError("CERTIFICATE_IMPORT_ENDED_YEAR_FIELD_FORBIDDEN"))).toBe(false);
    expect(isCertificateImportInlineError(new Error("x"))).toBe(false);
  });

  it("has the new keys in every locale", async () => {
    for (const locale of ["es", "en", "pt-BR", "fr"]) {
      const locales = (await import(`../../../messages/${locale}.json`)).default;
      expect(locales.certificate_bulk_imports.errors.authorization_pending).toEqual(expect.any(String));
      expect(locales.certificate_bulk_imports.errors.ended_year_field_forbidden).toEqual(expect.any(String));
    }
  });
});

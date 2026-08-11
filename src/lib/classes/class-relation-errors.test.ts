import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/api/client";
import { getClassRelationErrorMessage } from "@/lib/classes/class-relation-errors";

describe("getClassRelationErrorMessage", () => {
  it("maps ADMIN_CLASS_PREREQUISITE_CYCLE to a readable Spanish message", () => {
    const error = new ApiError("ADMIN_CLASS_PREREQUISITE_CYCLE", 400, {
      code: "ADMIN_CLASS_PREREQUISITE_CYCLE",
    });

    expect(getClassRelationErrorMessage(error, "fallback")).toBe(
      "Crearía un ciclo de prerrequisitos entre clases.",
    );
  });

  it("maps ADMIN_CLASS_PREREQUISITE_DUPLICATE to a readable Spanish message", () => {
    const error = new ApiError("ADMIN_CLASS_PREREQUISITE_DUPLICATE", 409, {
      code: "ADMIN_CLASS_PREREQUISITE_DUPLICATE",
    });

    expect(getClassRelationErrorMessage(error, "fallback")).toBe(
      "Esta clase ya está registrada como prerrequisito.",
    );
  });

  it("maps ADMIN_CLASS_HONOR_DUPLICATE to a readable Spanish message", () => {
    const error = new ApiError("ADMIN_CLASS_HONOR_DUPLICATE", 409, {
      code: "ADMIN_CLASS_HONOR_DUPLICATE",
    });

    expect(getClassRelationErrorMessage(error, "fallback")).toBe(
      "Esta especialidad ya está asociada a la clase con ese tipo de relación.",
    );
  });

  it("maps 401/403 to a generic permission message regardless of code", () => {
    const error = new ApiError("Forbidden", 403, { code: "SOME_OTHER_CODE" });

    expect(getClassRelationErrorMessage(error, "fallback")).toBe(
      "No tienes permisos para realizar esta acción.",
    );
  });

  it("maps 404 without a mapped code to a generic not-found message", () => {
    const error = new ApiError("Not found", 404, { code: "UNMAPPED_CODE" });

    expect(getClassRelationErrorMessage(error, "fallback")).toBe(
      "El registro no existe o ya fue eliminado.",
    );
  });

  it("falls back to the ApiError message when the code is unmapped", () => {
    const error = new ApiError("Algo salió mal", 500, { code: "UNMAPPED_CODE" });

    expect(getClassRelationErrorMessage(error, "fallback")).toBe("Algo salió mal");
  });

  it("falls back to the provided fallback for non-ApiError values", () => {
    expect(getClassRelationErrorMessage("boom", "fallback")).toBe("fallback");
    expect(getClassRelationErrorMessage(new Error("plain error"), "fallback")).toBe(
      "plain error",
    );
  });
});

import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/api/client";
import { getActionErrorMessage } from "@/lib/api/action-error";

describe("getActionErrorMessage", () => {
  it("maps CAMPOREE_EVENT_RESPONSIBLE_REQUIRED from the payload code", () => {
    const error = new ApiError("App Bad Request Exception", 400, {
      code: "CAMPOREE_EVENT_RESPONSIBLE_REQUIRED",
    });

    expect(getActionErrorMessage(error, "fallback")).toContain(
      "responsable del roster de personal",
    );
  });

  it("maps CAMPOREE_EVENT_HONOR_NOT_FOUND", () => {
    const error = new ApiError("App Bad Request Exception", 400, {
      code: "CAMPOREE_EVENT_HONOR_NOT_FOUND",
    });

    expect(getActionErrorMessage(error, "fallback")).toContain(
      "especialidades seleccionadas",
    );
  });

  it("keeps permission copy for 403", () => {
    const error = new ApiError("Forbidden", 403, null);

    expect(getActionErrorMessage(error, "fallback")).toBe(
      "No tienes permisos para realizar esta acción.",
    );
  });
});

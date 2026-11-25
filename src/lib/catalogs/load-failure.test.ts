import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/client";

import { canShowCatalogCreate, catalogLoadFailure } from "./load-failure";

const apiError = (status: number) => new ApiError("boom", status, null);

describe("catalogLoadFailure", () => {
  it("maps 429 to rateLimited without technical detail", () => {
    expect(catalogLoadFailure(apiError(429))).toEqual({ kind: "rateLimited" });
  });

  it("maps 401/403 to forbidden and 404 to notFound", () => {
    expect(catalogLoadFailure(apiError(403)).kind).toBe("forbidden");
    expect(catalogLoadFailure(apiError(401)).kind).toBe("forbidden");
    expect(catalogLoadFailure(apiError(404)).kind).toBe("notFound");
  });

  it("maps network failures to offline", () => {
    expect(catalogLoadFailure(new TypeError("fetch failed")).kind).toBe("offline");
  });

  it("maps other statuses to a generic error that carries the code", () => {
    const failure = catalogLoadFailure(apiError(500));
    expect(failure.kind).toBe("error");
    expect(failure.detail?.code).toBe(500);
  });
});

describe("canShowCatalogCreate", () => {
  it("shows create only with permission and a loaded list", () => {
    expect(canShowCatalogCreate({ canCreate: true, failure: null })).toBe(true);
    expect(canShowCatalogCreate({ canCreate: false, failure: null })).toBe(false);
  });

  it("hides create after a 429 or any failure", () => {
    expect(canShowCatalogCreate({ canCreate: true, failure: catalogLoadFailure(apiError(429)) })).toBe(false);
    expect(canShowCatalogCreate({ canCreate: true, failure: catalogLoadFailure(apiError(500)) })).toBe(false);
  });
});

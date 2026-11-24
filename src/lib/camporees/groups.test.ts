import { describe, expect, it } from "vitest";
import {
  camporeeGroupHref,
  defaultViewOf,
  legacyDetailRedirect,
  resolveCamporeeLocation,
} from "./groups";

describe("resolveCamporeeLocation", () => {
  it("opens the summary by default", () => {
    expect(resolveCamporeeLocation(undefined)).toEqual({ group: "summary", view: null });
    expect(resolveCamporeeLocation("nonsense")).toEqual({ group: "summary", view: null });
  });

  it("maps every old tab to its group and view", () => {
    expect(resolveCamporeeLocation("events")).toEqual({ group: "program", view: "events" });
    expect(resolveCamporeeLocation("payments")).toEqual({ group: "money", view: "payments" });
    expect(resolveCamporeeLocation("staff")).toEqual({ group: "program", view: "staff" });
    expect(resolveCamporeeLocation("ranking")).toEqual({ group: "scores", view: "results" });
    expect(resolveCamporeeLocation("judges")).toEqual({ group: "scores", view: "judges" });
    expect(resolveCamporeeLocation("members")).toEqual({
      group: "registrations",
      view: "members",
    });
  });

  it("accepts a group with a valid view and falls back for an invalid one", () => {
    expect(resolveCamporeeLocation("money", "supplies")).toEqual({
      group: "money",
      view: "supplies",
    });
    expect(resolveCamporeeLocation("money", "events")).toEqual({
      group: "money",
      view: defaultViewOf("money"),
    });
  });
});

describe("camporeeGroupHref", () => {
  it("builds local and union URLs and omits the default view", () => {
    expect(camporeeGroupHref("local", 7, "summary")).toBe("/dashboard/campamentos/7");
    expect(camporeeGroupHref("local", 7, "money", "payments")).toBe(
      "/dashboard/campamentos/7?tab=money",
    );
    expect(camporeeGroupHref("union", 3, "registrations", "pending")).toBe(
      "/dashboard/campamentos/union/3?tab=registrations",
    );
    expect(camporeeGroupHref("local", 7, "program", "staff")).toBe(
      "/dashboard/campamentos/7?tab=program&view=staff",
    );
  });
});

describe("legacyDetailRedirect", () => {
  it("sends old tabs to their group and keeps the other filters", () => {
    expect(legacyDetailRedirect("local", 7, { tab: "events", q: "nudos", venue: "3" })).toBe(
      "/dashboard/campamentos/7?q=nudos&venue=3&tab=program",
    );
    expect(legacyDetailRedirect("union", 3, { tab: "staff" })).toBe(
      "/dashboard/campamentos/union/3?tab=program&view=staff",
    );
    expect(legacyDetailRedirect("local", 7, { tab: "info" })).toBe("/dashboard/campamentos/7");
    expect(legacyDetailRedirect("local", 7, { tab: "ranking" })).toBe(
      "/dashboard/campamentos/7?tab=scores&view=results",
    );
  });

  it("leaves canonical and unknown URLs alone", () => {
    expect(legacyDetailRedirect("local", 7, { tab: "money", view: "supplies" })).toBeNull();
    expect(legacyDetailRedirect("local", 7, {})).toBeNull();
    expect(legacyDetailRedirect("local", 7, { tab: "nonsense" })).toBeNull();
  });
});

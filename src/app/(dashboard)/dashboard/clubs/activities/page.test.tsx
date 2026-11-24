import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { TEST_MESSAGES } from "@/components/activities/test-messages";

function lookup(namespace: string, key: string) {
  const path = `${namespace}.${key}`.split(".");
  let node: unknown = TEST_MESSAGES;
  for (const part of path) node = (node as Record<string, unknown>)?.[part];
  return typeof node === "string" ? node : path.join(".");
}

vi.mock("next-intl/server", () => ({
  getLocale: async () => "es",
  getTranslations: async (namespace: string) => (key: string, values?: Record<string, unknown>) =>
    lookup(namespace, key).replace("{count, plural, one {# actividad próxima} other {# actividades próximas}}", `${values?.count} actividades próximas`),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`);
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/lib/auth/session", () => ({ requireAdminUser: async () => ({}) }));
vi.mock("@/lib/auth/screen-catalog", () => ({ canViewScreen: () => true, canCapability: () => true }));
vi.mock("@/lib/auth/territory-scope", () => ({
  resolveAdminTerritoryScope: () => ({}),
  canAdminFilterByLocalField: () => false,
  listLocalFieldsForTerritory: async () => [],
}));
vi.mock("@/lib/api/catalogs", () => ({ listClubTypes: async () => [] }));

const loadClubsMock = vi.fn();
vi.mock("@/lib/club-context/load-clubs", () => ({ loadClubContextClubs: (...args: unknown[]) => loadClubsMock(...args) }));
const listActivitiesMock = vi.fn();
vi.mock("@/lib/api/activities", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/activities")>()),
  listActivities: (...args: unknown[]) => listActivitiesMock(...args),
}));

vi.mock("@/components/shared/page-header", () => ({
  PageHeader: ({ title, description, actions }: { title?: string; description?: string; actions?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      <p data-testid="description">{description}</p>
      {actions}
    </header>
  ),
}));
vi.mock("@/components/shared/club-context-bar", () => ({
  ClubContextBar: ({ clubId, sectionId }: { clubId: number | null; sectionId: number | null }) => (
    <div data-testid="bar" data-club={clubId ?? ""} data-section={sectionId ?? ""} />
  ),
  ClubPickList: () => <div data-testid="pick-list" />,
}));
vi.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ kind, description }: { kind: string; description?: string }) => (
    <div role="alert" data-kind={kind}>{description}</div>
  ),
}));
vi.mock("@/components/activities/activities-view", () => ({
  ActivitiesView: ({ activities }: { activities: Array<{ activity_id: number }> }) => (
    <div data-testid="view">{activities.map((a) => a.activity_id).join(",")}</div>
  ),
}));

import ClubActivitiesPage from "./page";
import { ApiError } from "@/lib/api/client";

const section = (id: number, name: string) => ({ club_section_id: id, club_type_id: id, name, club_type: { name } });
const CLUB = { club_id: 1, name: "Club Orión", sections: [section(3, "Conquistadores"), section(4, "Aventureros")] };

const row = (id: number, sectionId: number, date: string) => ({
  activity_id: id,
  name: `Actividad ${id}`,
  club_id: 1,
  club_type_id: sectionId,
  club_section_id: sectionId,
  activity_date: date,
  activity_place: "x",
  activity_type_id: 1,
});

beforeEach(() => {
  loadClubsMock.mockResolvedValue({ ok: true, clubs: [CLUB] });
  listActivitiesMock.mockResolvedValue({ data: [row(1, 3, "2999-01-01"), row(2, 4, "2999-01-02")] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderPage(search: { club?: string; section?: string } = {}) {
  render(await ClubActivitiesPage({ searchParams: Promise.resolve(search) }));
}

describe("ClubActivitiesPage", () => {
  it("lists the clubs to pick from when none is chosen", async () => {
    loadClubsMock.mockResolvedValue({ ok: true, clubs: [CLUB, { ...CLUB, club_id: 2, name: "Club Cedros" }] });

    await renderPage();

    expect(screen.getByTestId("pick-list")).toBeInTheDocument();
    expect(listActivitiesMock).not.toHaveBeenCalled();
  });

  it("shows the activities of the chosen club and a way to create one", async () => {
    await renderPage({ club: "1" });

    expect(screen.getByTestId("view")).toHaveTextContent("1,2");
    expect(screen.getByRole("link", { name: /Nueva actividad/ })).toHaveAttribute(
      "href",
      "/dashboard/clubs/activities/new?club=1",
    );
  });

  it("narrows to one section", async () => {
    await renderPage({ club: "1", section: "4" });

    expect(screen.getByTestId("view")).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: /Nueva actividad/ })).toHaveAttribute(
      "href",
      "/dashboard/clubs/activities/new?club=1&section=4",
    );
  });

  it("says so when the activities fail to load, instead of an empty calendar", async () => {
    listActivitiesMock.mockRejectedValue(new ApiError("boom", 500, null));

    await renderPage({ club: "1" });

    expect(screen.getByRole("alert")).toHaveAttribute("data-kind", "error");
    expect(screen.queryByTestId("view")).toBeNull();
    expect(screen.getByTestId("bar")).toBeInTheDocument();
  });

  it("says so when the clubs fail to load", async () => {
    loadClubsMock.mockResolvedValue({ ok: false, error: new ApiError("down", 503, null), message: null });

    await renderPage({ club: "1" });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByTestId("view")).toBeNull();
  });

  it("reads every page the API returns (it caps a page at 100)", async () => {
    const page = (start: number) => Array.from({ length: 100 }, (_, i) => row(start + i, 3, "2999-01-01"));
    listActivitiesMock
      .mockResolvedValueOnce({ data: page(1), meta: { hasNextPage: true } })
      .mockResolvedValueOnce({ data: [row(500, 3, "2999-01-01")], meta: { hasNextPage: false } });

    await renderPage({ club: "1" });

    expect(listActivitiesMock).toHaveBeenCalledTimes(2);
    expect(listActivitiesMock).toHaveBeenLastCalledWith(1, expect.objectContaining({ page: 2, limit: 100 }));
  });
});

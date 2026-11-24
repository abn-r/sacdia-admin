import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { TEST_MESSAGES } from "@/components/activities/test-messages";

vi.mock("next-intl/server", () => ({
  getLocale: async () => "es",
  getTranslations: async (namespace: string) => (key: string) => {
    const path = `${namespace}.${key}`.split(".");
    let node: unknown = TEST_MESSAGES;
    for (const part of path) node = (node as Record<string, unknown>)?.[part];
    return typeof node === "string" ? node : path.join(".");
  },
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`);
  },
}));

vi.mock("@/lib/auth/session", () => ({ requireAdminUser: async () => ({}) }));
vi.mock("@/lib/auth/screen-catalog", () => ({
  canViewScreen: () => true,
  canCapability: () => true,
}));

vi.mock("@/components/shared/detail-header", () => ({
  DetailHeader: ({
    title,
    subtitle,
    breadcrumbs,
  }: {
    title: string;
    subtitle?: React.ReactNode;
    breadcrumbs?: Array<{ label: string; href?: string }>;
  }) => (
    <header>
      <nav>{breadcrumbs?.map((crumb) => <a key={crumb.label} href={crumb.href}>{crumb.label}</a>)}</nav>
      <h1>{title}</h1>
      <p data-testid="subtitle">{subtitle}</p>
    </header>
  ),
}));
vi.mock("@/components/shared/page-header", () => ({
  PageHeader: ({ title }: { title?: string }) => <h1>{title}</h1>,
}));
vi.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ kind, description }: { kind: string; description?: string }) => (
    <div role="alert" data-kind={kind}>{description}</div>
  ),
}));
vi.mock("@/components/activities/activity-detail-actions", () => ({
  ActivityDetailActions: () => null,
}));
vi.mock("@/components/activities/attendance-panel", () => ({
  AttendancePanel: ({ records }: { records: unknown[] }) => <div data-testid="attendance">{records.length}</div>,
}));
vi.mock("@/components/activities/activity-audience-label", () => ({
  ActivityAudienceValue: () => <span>Toda la sección</span>,
}));
vi.mock("@/components/activities/activity-series-panel", () => ({
  ActivitySeriesPanel: ({ series }: { series: { name: string } }) => (
    <span data-testid="series">Ver serie · {series.name}</span>
  ),
}));

const getActivityMock = vi.fn();
const getAttendanceMock = vi.fn();
vi.mock("@/lib/api/activities", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/activities")>()),
  getActivity: (...args: unknown[]) => getActivityMock(...args),
  getAttendance: (...args: unknown[]) => getAttendanceMock(...args),
  listActivities: async () => ({ data: [] }),
}));
vi.mock("@/lib/api/catalogs", () => ({ listClubTypes: async () => [] }));
vi.mock("@/lib/club-context/load-clubs", () => ({
  loadClubContextClubs: async () => ({
    ok: true,
    clubs: [
      {
        club_id: 1,
        name: "Club Orión",
        sections: [{ club_section_id: 3, club_type_id: 2, name: "Conquistadores", club_type: { name: "Conquistadores" } }],
      },
    ],
  }),
}));
const apiRequestMock = vi.fn();
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

import ActivityDetailPage from "./page";
import { ApiError } from "@/lib/api/client";

const ACTIVITY = {
  activity_id: 7,
  name: "Campamento de primavera",
  club_id: 1,
  club_type_id: 2,
  club_section_id: 3,
  lat: 19.17,
  long: -96.13,
  activity_date: "2026-11-05",
  activity_time: "09:00",
  activity_place: "Camp Zacatecas",
  activity_type_id: 1,
  platform: 0,
  active: true,
};

beforeEach(() => {
  getActivityMock.mockResolvedValue({ data: ACTIVITY });
  getAttendanceMock.mockResolvedValue([]);
  apiRequestMock.mockResolvedValue({ data: { activity_series_id: 5, name: "Serie" } });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderPage() {
  render(await ActivityDetailPage({ params: Promise.resolve({ id: "7" }) }));
}

describe("ActivityDetailPage dates", () => {
  it("formats the date for the active locale instead of showing raw ISO", async () => {
    await renderPage();

    expect(screen.getByText("5 de noviembre de 2026")).toBeInTheDocument();
    expect(screen.queryByText("2026-11-05")).toBeNull();
  });

  it("shows a formatted end date when the activity spans several days", async () => {
    getActivityMock.mockResolvedValue({ data: { ...ACTIVITY, activity_end_date: "2026-11-07" } });

    await renderPage();

    expect(screen.getByText(/5 de noviembre de 2026 – 7 de noviembre de 2026/)).toBeInTheDocument();
  });
});

describe("ActivityDetailPage content", () => {
  it("says the club and the section", async () => {
    await renderPage();

    expect(screen.getByTestId("subtitle")).toHaveTextContent("Club Orión · Conquistadores · Regular");
  });

  it("shows the address of an in-person activity, never its coordinates", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: "Camp Zacatecas" })).toBeInTheDocument();
    expect(screen.queryByText(/19\.17/)).toBeNull();
    expect(screen.queryByText("Coordenadas")).toBeNull();
  });

  it("shows a virtual activity with its link and no address or coordinates", async () => {
    getActivityMock.mockResolvedValue({
      data: {
        ...ACTIVITY,
        platform: 1,
        lat: 0,
        long: 0,
        activity_place: "Virtual",
        link_meet: "https://meet.example.test/abc-defg",
      },
    });

    await renderPage();

    expect(screen.getByRole("link", { name: "https://meet.example.test/abc-defg" })).toBeInTheDocument();
    expect(screen.queryByText("Lugar")).toBeNull();
    expect(screen.queryByRole("link", { name: "Virtual" })).toBeNull();
    expect(screen.queryByText("Coordenadas")).toBeNull();
  });

  it("offers the series of a session", async () => {
    getActivityMock.mockResolvedValue({ data: { ...ACTIVITY, activity_series_id: 5 } });

    await renderPage();

    expect(screen.getByTestId("series")).toHaveTextContent("Ver serie");
  });

  it("is plain sections: no tabs and no cards", async () => {
    const { container } = render(await ActivityDetailPage({ params: Promise.resolve({ id: "7" }) }));

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
    expect(screen.getByRole("heading", { name: "Registrados" })).toBeInTheDocument();
  });

  it("says when the attendance failed to load instead of showing it empty", async () => {
    getAttendanceMock.mockRejectedValue(new ApiError("boom", 500, null));

    await renderPage();

    expect(screen.getByRole("alert")).toHaveAttribute("data-kind", "error");
    expect(screen.queryByTestId("attendance")).toBeNull();
  });

  it("sends a missing activity to not found", async () => {
    getActivityMock.mockRejectedValue(new ApiError("nope", 404, null));

    await expect(renderPage()).rejects.toThrow("notFound");
  });

  it("says so when the activity cannot be loaded", async () => {
    getActivityMock.mockRejectedValue(new ApiError("boom", 500, null));

    await renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar la actividad");
  });
});

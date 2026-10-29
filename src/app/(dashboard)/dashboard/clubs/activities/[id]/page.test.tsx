import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import messages from "../../../../../../../messages/es.json";

vi.mock("next-intl/server", () => ({
  getLocale: async () => "es",
  getTranslations: async (namespace: string) => (key: string) => {
    const path = `${namespace}.${key}`.split(".");
    let node: unknown = messages;
    for (const part of path) node = (node as Record<string, unknown>)?.[part];
    return typeof node === "string" ? node : path.join(".");
  },
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

vi.mock("@/lib/auth/session", () => ({ requireAdminUser: async () => ({}) }));

vi.mock("@/components/shared/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/components/activities/activity-detail-actions", () => ({
  ActivityDetailActions: () => null,
}));
vi.mock("@/components/activities/attendance-panel", () => ({
  AttendancePanel: () => null,
}));
vi.mock("@/components/activities/activity-audience-label", () => ({
  ActivityAudienceValue: () => null,
}));

const getActivityMock = vi.fn();
vi.mock("@/lib/api/activities", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/activities")>()),
  getActivity: (...args: unknown[]) => getActivityMock(...args),
  getAttendance: async () => [],
}));

import ActivityDetailPage from "./page";

const ACTIVITY = {
  activity_id: 7,
  name: "Campamento de primavera",
  club_id: 1,
  club_type_id: 2,
  club_section_id: 3,
  lat: 0,
  long: 0,
  activity_date: "2026-11-05",
  activity_time: "09:00",
  activity_place: "Camp Zacatecas",
  activity_type_id: 1,
  active: true,
};

beforeEach(() => {
  getActivityMock.mockResolvedValue({ data: ACTIVITY });
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
    expect(screen.queryByText("Fecha de fin")).toBeNull();
  });

  it("shows a formatted end date when the activity spans several days", async () => {
    getActivityMock.mockResolvedValue({
      data: { ...ACTIVITY, activity_end_date: "2026-11-07" },
    });

    await renderPage();

    expect(screen.getByText("Fecha de fin")).toBeInTheDocument();
    expect(screen.getByText("7 de noviembre de 2026")).toBeInTheDocument();
  });
});

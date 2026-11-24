import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { TEST_MESSAGES } from "./test-messages";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => {
    const path = `${namespace}.${key}`.split(".");
    let node: unknown = TEST_MESSAGES;
    for (const part of path) node = (node as Record<string, unknown>)?.[part];
    return typeof node === "string" ? node : path.join(".");
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`);
  },
}));
vi.mock("@/lib/auth/session", () => ({ requireAdminUser: async () => ({}) }));

let allowed = true;
vi.mock("@/lib/auth/screen-catalog", () => ({ canCapability: () => allowed }));

const loadMock = vi.fn();
vi.mock("@/lib/activities/form-data", () => ({ loadActivityFormData: (...args: unknown[]) => loadMock(...args) }));

vi.mock("@/components/shared/form-modal", () => ({
  RouteFormModal: ({
    title,
    description,
    dismissHref,
    children,
  }: {
    title: string;
    description?: string;
    dismissHref?: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="modal" data-dismiss={dismissHref ?? ""}>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  ),
}));
vi.mock("@/components/shared/form-modal-forbidden", () => ({
  FormModalForbidden: ({ title }: { title: string }) => <div data-testid="forbidden">{title}</div>,
}));
vi.mock("@/components/activities/activity-form", () => ({
  ActivityForm: ({ listHref, clubId }: { listHref: string; clubId: number }) => (
    <div data-testid="form" data-list={listHref} data-club={clubId} />
  ),
}));

import { ActivityModal } from "./activity-modal";

const DATA = {
  club: {
    club_id: 1,
    name: "Club Orión",
    sections: [
      { club_section_id: 3, club_type_id: 2, name: "Conquistadores", club_type: { name: "Conquistadores" } },
      { club_section_id: 4, club_type_id: 1, name: "Aventureros", club_type: { name: "Aventureros" } },
    ],
  },
  defaultSectionId: 3,
  activity: null,
};

beforeEach(() => {
  allowed = true;
  loadMock.mockResolvedValue(DATA);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ActivityModal", () => {
  it("opens the form with the club and section in the description", async () => {
    render(await ActivityModal({ searchParams: { club: "1" } }));

    expect(screen.getByRole("heading", { name: "Nueva actividad" })).toBeInTheDocument();
    expect(screen.getByText("Club Orión · Conquistadores")).toBeInTheDocument();
    expect(screen.getByTestId("form")).toHaveAttribute("data-list", "/dashboard/clubs/activities?club=1&section=3");
  });

  it("is forbidden only when the actor lacks the permission", async () => {
    allowed = false;

    render(await ActivityModal({ searchParams: { club: "1" } }));

    expect(screen.getByTestId("forbidden")).toHaveTextContent("Nueva actividad");
    expect(loadMock).not.toHaveBeenCalled();
  });

  it("goes back to the list when there is no club or the activity is missing", async () => {
    loadMock.mockResolvedValue(null);

    await expect(ActivityModal({ searchParams: {} })).rejects.toThrow("redirect:/dashboard/clubs/activities");
    await expect(ActivityModal({ searchParams: {}, activityId: 9 })).rejects.toThrow(
      "redirect:/dashboard/clubs/activities",
    );
  });

  it("titles the edit and passes the dismiss target of a direct load", async () => {
    render(await ActivityModal({ searchParams: {}, activityId: 9, dismissHref: "/dashboard/clubs/activities/9" }));

    expect(screen.getByRole("heading", { name: "Editar actividad" })).toBeInTheDocument();
    expect(screen.getByTestId("modal")).toHaveAttribute("data-dismiss", "/dashboard/clubs/activities/9");
  });
});

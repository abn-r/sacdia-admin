import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EventFormPage } from "@/components/camporee-events/event-form-page";
import type { Camporee } from "@/lib/api/camporees";
import type { CamporeeVenue } from "@/lib/api/camporee-venues";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/shared/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <header>{title}</header>,
}));

vi.mock("@/components/camporee-events/venue-create-dialog", () => ({
  VenueCreateDialog: () => null,
}));

vi.mock("@/components/camporee-events/rubrics-editor", () => ({
  RubricsEditor: () => <div data-testid="rubrics-editor" />,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const camporee: Camporee = {
  camporee_id: 70,
  name: "Camporee local",
  start_date: "2026-07-02",
  end_date: "2026-07-03",
  includes_adventurers: true,
  includes_pathfinders: true,
  includes_master_guides: true,
};

const venues: CamporeeVenue[] = [
  {
    camporee_venue_id: 1,
    scope: "local_field",
    name: "Auditorio",
    capacity: 100,
    active: true,
  },
];

describe("EventFormPage", () => {
  afterEach(() => cleanup());

  it("renders optional venue and leader selects without empty SelectItem values", () => {
    const action = vi.fn(async () => ({}));

    expect(() =>
      render(
        <EventFormPage
          mode="create"
          camporeeId={70}
          camporee={camporee}
          venues={venues}
          users={[{ value: "user-1", label: "Ana Responsable", email: "ana@example.com" }]}
          action={action}
        />,
      ),
    ).not.toThrow();

    expect(screen.getByText("Sede")).toBeInTheDocument();
    expect(screen.getByText("Responsable")).toBeInTheDocument();
  });
});

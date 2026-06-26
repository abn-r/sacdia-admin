import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

const mockListAssignments = vi.fn();
const mockListMembers = vi.fn();
const mockListClasses = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/api/clubs", () => ({
  listClassCounselorAssignments: (...args: unknown[]) =>
    mockListAssignments(...args),
  listNormalizedClubSectionMembers: (...args: unknown[]) =>
    mockListMembers(...args),
}));

vi.mock("@/lib/api/classes", () => ({
  listClasses: (...args: unknown[]) => mockListClasses(...args),
}));

vi.mock("@/lib/clubs/actions", () => ({
  createClassCounselorAssignmentAction: vi.fn(),
  updateClassCounselorAssignmentAction: vi.fn(),
  revokeClassCounselorAssignmentAction: vi.fn(),
}));

import {
  ClassCounselorAssignmentsCard,
  toAssignableClassCounselorOptions,
} from "@/components/classes/class-counselor-assignments-card";

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <ClassCounselorAssignmentsCard
          clubId={10}
          sectionId={7}
          clubTypeId={2}
          sectionName="Conquistadores Central"
        />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe("ClassCounselorAssignmentsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    mockListAssignments.mockResolvedValue([
      {
        assignment_id: "assignment-1",
        user_id: "user-1",
        class_id: 3,
        responsibility_type: "primary",
        exceptional: false,
        active: true,
        users: { name: "Ana", paternal_last_name: "García" },
        classes: { name: "Amigo" },
      },
    ]);
    mockListMembers.mockResolvedValue([
      { user_id: "user-1", name: "Ana García", role: "counselor" },
      { user_id: "user-2", name: "Beto Secretario", role: "secretary" },
      { user_id: "user-3", name: "Iris Instructora", role: "instructor" },
    ]);
    mockListClasses.mockResolvedValue({
      data: [{ class_id: 3, name: "Amigo", club_type_id: 2 }],
    });
  });

  afterEach(() => cleanup());

  it("shows existing class assignments", async () => {
    renderCard();

    await waitFor(() => {
      expect(screen.getByText("Clases asignadas")).toBeInTheDocument();
      expect(screen.getByText("Ana García")).toBeInTheDocument();
      expect(screen.getAllByText("Amigo").length).toBeGreaterThan(0);
    });
  });

  it("builds assignable options only from counselor and secretary roles", () => {
    expect(
      toAssignableClassCounselorOptions([
        { user_id: "user-1", name: "Ana", role: "counselor" },
        { user_id: "user-2", name: "Beto", role: "secretary" },
        { user_id: "user-3", name: "Iris", role: "instructor" },
      ]),
    ).toEqual([
      { value: "user-1", label: "Ana", role: "counselor" },
      { value: "user-2", label: "Beto", role: "secretary" },
    ]);
  });
});

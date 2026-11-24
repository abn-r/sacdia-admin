import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlWrapper, testMessages } from "@/components/requests/test-intl";
import type { AssignmentRequest } from "@/lib/api/requests";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const navReplace = vi.fn();
let navSearch = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navReplace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/requests/assignments",
  useSearchParams: () => new URLSearchParams(navSearch),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockList = vi.fn<(...args: any[]) => Promise<AssignmentRequest[]>>();
const mockReview = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */
vi.mock("@/lib/api/requests", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/requests")>();
  return {
    ...original,
    getAssignmentRequests: (...args: unknown[]) => mockList(...args),
    reviewAssignmentRequest: (...args: unknown[]) => mockReview(...args),
  };
});

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { AssignmentsQueue } from "@/components/requests/assignments-queue";

const msg = testMessages.queues.requests;
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

function assignment(
  id: string,
  name: string,
  role: string,
  section: string,
  days: number,
  overrides: Partial<AssignmentRequest> = {},
): AssignmentRequest {
  return {
    request_id: id,
    status: "PENDING",
    role_to_assign: role,
    comment: null,
    created_at: daysAgo(days),
    reviewed_at: null,
    target_user: { user_id: `u-${id}`, first_name: name.split(" ")[0] ?? name, last_name: name.split(" ")[1] ?? "", email: "lucia.gomez@correo.test" },
    section: { section_id: 1, name: section },
    requested_by: { user_id: "d1", first_name: "Mateo", last_name: "Herrera" },
    ...overrides,
  };
}

const ROWS = [
  assignment("a1", "Lucía Gómez", "counselor", "Club Orión · Conquistadores", 9),
  assignment("a2", "Tomás Aguilar", "treasurer", "Club Cedros · Aventureros", 3),
  assignment("a3", "Paola Núñez", "secretary", "Club Faro · Guías Mayores", 20, { status: "APPROVED", reviewed_at: daysAgo(5) }),
];

function renderQueue(props: Partial<React.ComponentProps<typeof AssignmentsQueue>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlWrapper>
        <AssignmentsQueue initialRequests={ROWS} canReview {...props} />
      </IntlWrapper>
    </QueryClientProvider>,
  );
}
const table = () => screen.getByRole("table");

beforeEach(() => {
  vi.clearAllMocks();
  navSearch = "";
  mockList.mockResolvedValue(ROWS);
  mockReview.mockResolvedValue({});
});
afterEach(() => cleanup());

describe("AssignmentsQueue", () => {
  it("tabs with real counts; Pendientes lists only pending with no status column", () => {
    renderQueue();
    expect(screen.getByRole("tab", { name: /Pendientes\s*2/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Aprobadas\s*1/ })).toBeInTheDocument();
    expect(within(table()).getByText("Lucía Gómez")).toBeInTheDocument();
    expect(within(table()).queryByText("Paola Núñez")).toBeNull();
    expect(within(table()).queryByRole("columnheader", { name: "Estado" })).toBeNull();
  });

  it("filters by role and section", async () => {
    const user = userEvent.setup();
    renderQueue();
    await user.selectOptions(screen.getByLabelText(msg.assignments.filters.role), "treasurer");
    expect(within(table()).getByText("Tomás Aguilar")).toBeInTheDocument();
    expect(within(table()).queryByText("Lucía Gómez")).toBeNull();

    await user.selectOptions(screen.getByLabelText(msg.assignments.filters.role), "");
    await user.selectOptions(screen.getByLabelText(msg.assignments.filters.section), "Club Orión · Conquistadores");
    expect(within(table()).getByText("Lucía Gómez")).toBeInTheDocument();
    expect(within(table()).queryByText("Tomás Aguilar")).toBeNull();
  });

  it("the sheet says in one sentence which role the person receives and where", async () => {
    const user = userEvent.setup();
    renderQueue();
    await user.click(screen.getByRole("button", { name: "Revisar: Lucía Gómez" }));
    const sheet = await screen.findByRole("dialog");
    const sentence = within(sheet).getByText(/Recibe el cargo/);
    expect(sentence).toHaveTextContent("Recibe el cargo Consejero en Club Orión · Conquistadores.");
    expect(within(sheet).getByText("Mateo Herrera")).toBeInTheDocument();
  });

  it("approves from the sheet with an optional comment", async () => {
    const user = userEvent.setup();
    renderQueue();
    await user.click(screen.getByRole("button", { name: "Revisar: Lucía Gómez" }));
    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: msg.assignments.sheet.approve }));
    await waitFor(() => expect(mockReview).toHaveBeenCalledWith("a1", { action: "approved" }));
    expect(toast.success).toHaveBeenCalledWith(msg.assignments.toasts.approved);
  });

  it("rejects inside the same sheet and says who will read the reason", async () => {
    const user = userEvent.setup();
    renderQueue();
    await user.click(screen.getByRole("button", { name: "Revisar: Tomás Aguilar" }));
    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: msg.common.rejectAction }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(within(sheet).getByText(new RegExp(msg.assignments.sheet.rejectAudience))).toBeInTheDocument();
    await user.type(within(sheet).getByLabelText(new RegExp(msg.sheet.reasonLabel)), "Ya hay un tesorero");
    await user.click(within(sheet).getByRole("button", { name: msg.assignments.sheet.rejectConfirm }));
    await waitFor(() =>
      expect(mockReview).toHaveBeenCalledWith("a2", { action: "rejected", comment: "Ya hay un tesorero" }),
    );
  });

  it("zero pending keeps tabs and history", () => {
    renderQueue({ initialRequests: [ROWS[2] as AssignmentRequest] });
    expect(screen.getByRole("tab", { name: /Pendientes\s*0/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Aprobadas\s*1/ })).toBeInTheDocument();
    expect(screen.getByText(msg.assignments.empty.pending.title)).toBeInTheDocument();
  });

  it("a failed load is an error in the table frame, not an empty list", () => {
    renderQueue({ initialRequests: null, initialFailure: { kind: "offline" } });
    expect(screen.getByText(msg.assignments.error.title)).toBeInTheDocument();
    expect(screen.queryByText(msg.assignments.empty.pending.title)).toBeNull();
    expect(screen.getByRole("tab", { name: "Pendientes" })).toBeInTheDocument();
  });

  it("read-only without review permission", async () => {
    const user = userEvent.setup();
    renderQueue({ canReview: false });
    await user.click(screen.getByRole("button", { name: "Ver: Lucía Gómez" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).queryByRole("button", { name: msg.assignments.sheet.approve })).toBeNull();
  });
});

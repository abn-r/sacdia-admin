import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { AdminAuditLogItem } from "@/lib/api/audit-logs";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
  replace: vi.fn(),
  search: "",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/configuration/audit",
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("@/lib/api/audit-logs", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/audit-logs")>()),
  listAdminAuditLogs: (...args: unknown[]) => mocks.list(...args),
  getAdminAuditLog: (...args: unknown[]) => mocks.detail(...args),
}));

import { AuditLogsViewer } from "./audit-logs-viewer";

function row(overrides: Partial<AdminAuditLogItem>): AdminAuditLogItem {
  return {
    audit_log_id: "a1",
    entity_type: "admin",
    entity_id: "3f2a1b4c-0000-4000-8000-000000000000",
    action: "DELETED",
    result: "succeeded",
    source: "http",
    summary: "DELETE /api/v1/admin/rbac/roles/[REDACTED]",
    actor: null,
    created_at: "2026-10-27T15:00:00.000Z",
    ...overrides,
  };
}

function renderViewer() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AuditLogsViewer />
    </NextIntlClientProvider>,
  );
}

describe("AuditLogsViewer", () => {
  beforeEach(() => {
    mocks.search = "";
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows readable labels for a role deactivation instead of the raw route", async () => {
    mocks.list.mockResolvedValue({ items: [row({})], next_cursor: null });
    renderViewer();

    await waitFor(() => expect(screen.getByText("Rol desactivado")).toBeInTheDocument());
    expect(screen.queryByText(/REDACTED/)).toBeNull();
    expect(screen.queryByText(/^admin\//)).toBeNull();
  });

  it("keeps the raw values for rows it cannot interpret", async () => {
    mocks.list.mockResolvedValue({
      items: [
        row({
          audit_log_id: "a2",
          entity_type: "clubs",
          entity_id: "12",
          summary: "POST /api/v1/clubs/12/members",
          action: "CREATED",
        }),
      ],
      next_cursor: null,
    });
    renderViewer();

    await waitFor(() =>
      expect(screen.getByText("POST /api/v1/clubs/12/members")).toBeInTheDocument(),
    );
  });

  it("marks only failed rows", async () => {
    mocks.list.mockResolvedValue({
      items: [row({}), row({ audit_log_id: "a3", result: "failed" })],
      next_cursor: null,
    });
    renderViewer();

    await waitFor(() => expect(screen.getAllByText("Rol desactivado")).toHaveLength(2));
    expect(screen.getAllByText("Falló")).toHaveLength(1);
  });

  it("fetches once per server filter set, not on every render or search change", async () => {
    mocks.list.mockResolvedValue({ items: [row({})], next_cursor: null });
    renderViewer();

    await waitFor(() => expect(screen.getByText("Rol desactivado")).toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mocks.list).toHaveBeenCalledTimes(1);
  });

  it("reads the filters from the URL and sends them to the API", async () => {
    mocks.search = "action=updated&result=failed&from=2026-11-01&to=2026-11-24";
    mocks.list.mockResolvedValue({ items: [], next_cursor: null });
    renderViewer();

    await waitFor(() => expect(mocks.list).toHaveBeenCalled());
    expect(mocks.list.mock.calls[0]?.[0]).toMatchObject({
      action: "UPDATED",
      result: "failed",
      from: "2026-11-01",
      to: "2026-11-24",
    });
  });

  it("finds session events through the client filter (login is stored as CREATED)", async () => {
    mocks.search = "action=login";
    mocks.list.mockResolvedValue({
      items: [
        row({
          audit_log_id: "l1",
          entity_type: "auth",
          entity_id: "-",
          action: "CREATED",
          summary: "POST /api/v1/auth/login",
        }),
        row({
          audit_log_id: "l2",
          entity_type: "auth",
          entity_id: "-",
          action: "CREATED",
          summary: "PATCH /api/v1/auth/me/context",
        }),
      ],
      next_cursor: null,
    });
    renderViewer();

    await waitFor(() => expect(screen.getAllByText("Inicio de sesión").length).toBeGreaterThan(0));
    expect(screen.queryByText("Cambio de contexto")).toBeNull();
    expect(mocks.list.mock.calls[0]?.[0]).toMatchObject({ action: "CREATED", entity_type: "auth" });
  });

  it("filters the loaded rows with the search param without refetching", async () => {
    mocks.search = "q=desactivado";
    mocks.list.mockResolvedValue({
      items: [
        row({}),
        row({
          audit_log_id: "t1",
          entity_type: "annual-folders",
          action: "UPDATED",
          summary: "PATCH /api/v1/annual-folders/templates/[REDACTED]",
        }),
      ],
      next_cursor: null,
    });
    renderViewer();

    await waitFor(() => expect(screen.getByText("Rol desactivado")).toBeInTheDocument());
    expect(screen.queryByText("Plantilla de carpeta actualizada")).toBeNull();
  });

  it("opens the side sheet with the changes in words and the JSON behind a toggle", async () => {
    mocks.list.mockResolvedValue({ items: [row({})], next_cursor: null });
    mocks.detail.mockResolvedValue({
      ...row({}),
      changes: { permissions: { from: ["clubs:read"], to: ["clubs:read", "reports:read"] } },
      request_context: { method: "DELETE", path: "/api/v1/admin/rbac/roles/x" },
    });
    renderViewer();

    await userEvent.click(await screen.findByText("Rol desactivado"));
    const sheet = await screen.findByRole("dialog");
    await waitFor(() => expect(within(sheet).getByText(/reports:read/)).toBeInTheDocument());
    expect(within(sheet).queryByText(/"request_context"/)).toBeNull();
  });
});

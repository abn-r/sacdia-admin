import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { AdminAuditLogItem } from "@/lib/api/audit-logs";

const mockList = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/audit-logs", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/audit-logs")>()),
  listAdminAuditLogs: (...args: unknown[]) => mockList(...args),
  getAdminAuditLog: vi.fn(),
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
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows readable labels for a role deactivation instead of the raw route", async () => {
    mockList.mockResolvedValue({ items: [row({})], next_cursor: null });
    renderViewer();

    await waitFor(() => expect(screen.getByText("Rol desactivado")).toBeInTheDocument());
    expect(screen.getByText("Desactivado")).toBeInTheDocument();
    expect(screen.queryByText("Eliminado")).toBeNull();
    expect(screen.queryByText(/REDACTED/)).toBeNull();
    expect(screen.queryByText(/^admin\//)).toBeNull();
  });

  it("keeps the raw values for rows it cannot interpret", async () => {
    mockList.mockResolvedValue({
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
    expect(screen.getByText("Creado")).toBeInTheDocument();
  });

  it("fetches the list once per filter set instead of refetching on re-render", async () => {
    mockList.mockResolvedValue({ items: [row({})], next_cursor: null });
    renderViewer();

    await waitFor(() => expect(screen.getByText("Rol desactivado")).toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("labels a login as a session event instead of a creation", async () => {
    mockList.mockResolvedValue({
      items: [
        row({
          audit_log_id: "l1",
          entity_type: "auth",
          entity_id: "-",
          action: "CREATED",
          summary: "POST /api/v1/auth/login",
        }),
      ],
      next_cursor: null,
    });
    renderViewer();

    await waitFor(() => expect(screen.getAllByText("Inicio de sesión").length).toBe(2));
    expect(screen.queryByText("Creado")).toBeNull();
    expect(screen.queryByText("auth/-")).toBeNull();
    expect(screen.queryByText(/POST \/api\/v1\/auth\/login/)).toBeNull();
  });

  it("shows a readable entity and label for a folder template update", async () => {
    mockList.mockResolvedValue({
      items: [
        row({
          audit_log_id: "t1",
          entity_type: "annual-folders",
          entity_id: "9c1d2e3f-0000-4000-8000-000000000000",
          action: "UPDATED",
          summary: "PATCH /api/v1/annual-folders/templates/[REDACTED]",
        }),
      ],
      next_cursor: null,
    });
    renderViewer();

    await waitFor(() =>
      expect(screen.getByText("Plantilla de carpeta actualizada")).toBeInTheDocument(),
    );
    expect(screen.getByText("Plantilla de carpeta")).toBeInTheDocument();
    expect(screen.getByText("9c1d2e3f…")).toBeInTheDocument();
    expect(screen.queryByText(/REDACTED/)).toBeNull();
  });
});

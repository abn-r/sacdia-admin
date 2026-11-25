/**
 * UserProgressSheet: loads a person's progress, keeps marks as a draft and
 * sends them together on «Guardar».
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import messages from "../../../messages/es.json";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { apiRequest, refresh, toastSuccess, toastError, permissions } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  permissions: new Set<string>(),
}));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiRequestFromClient: (...args: unknown[]) => apiRequest(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/dashboard/certifications/3",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));
vi.mock("@/lib/auth/use-permissions", () => ({
  usePermissions: () => ({
    can: (p: string) => permissions.has(p),
    canAny: () => false,
    canAll: () => false,
    isSuperAdmin: false,
    hasCapability: () => false,
    permissions,
    capabilities: new Set<string>(),
    roles: new Set<string>(["admin"]),
  }),
}));

import { UserProgressSheet } from "@/components/certifications/user-progress-sheet";

const tr = createTranslator({
  locale: "es",
  messages,
  namespace: "evaluation.certYear.certifications.progress",
});
const trSettings = createTranslator({ locale: "es", messages, namespace: "shared.kit.settings" });

const progressPayload = {
  status: "success",
  data: {
    certification_name: "Liderazgo juvenil",
    enrollment_date: "2026-02-03T00:00:00.000Z",
    modules: [
      {
        module_id: 1,
        name: "Trabajo en equipo",
        sections: [
          { section_id: 11, name: "Dinámicas de grupo", completed: true, completion_date: "2026-03-01T00:00:00.000Z" },
          { section_id: 12, name: "Resolución de conflictos", completed: false },
          { section_id: 13, name: "Proyecto en equipo", completed: false },
        ],
      },
    ],
  },
};

function renderSheet() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <UserProgressSheet
        open
        onOpenChange={vi.fn()}
        target={{ userId: "u-1", name: "Valeria Ortiz" }}
        certificationId={3}
      />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  permissions.clear();
  permissions.add("user_certifications:manage");
  apiRequest.mockImplementation(async (_path: string, options?: { method?: string }) =>
    options?.method === "PATCH" ? { status: "success" } : progressPayload,
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("UserProgressSheet", () => {
  it("loads the progress and counts the marked items", async () => {
    renderSheet();
    expect(await screen.findByText("Dinámicas de grupo")).toBeInTheDocument();
    expect(
      screen.getByText(tr("summary", { certification: "Liderazgo juvenil", done: 1, total: 3 })),
    ).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith(
      "/certifications/users/u-1/certifications/3/progress",
    );
  });

  it("does not save on click: marks wait for Guardar and go out together", async () => {
    renderSheet();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Resolución de conflictos" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Proyecto en equipo" }));

    expect(apiRequest.mock.calls.filter(([, o]) => o?.method === "PATCH")).toHaveLength(0);
    expect(screen.getByText(tr("unsaved", { count: 2 }))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: trSettings("save") }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(tr("saved")));

    const patches = apiRequest.mock.calls.filter(([, o]) => o?.method === "PATCH");
    expect(patches.map(([, o]) => o.body)).toEqual([
      { section_id: 12, completed: true },
      { section_id: 13, completed: true },
    ]);
    expect(refresh).toHaveBeenCalled();
  });

  it("Cancelar discards the draft", async () => {
    renderSheet();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Resolución de conflictos" }));
    fireEvent.click(screen.getByRole("button", { name: trSettings("cancel") }));
    expect(screen.queryByText(tr("unsaved", { count: 1 }))).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Resolución de conflictos" })).not.toBeChecked();
  });

  it("keeps the failed marks pending and reports them", async () => {
    apiRequest.mockImplementation(async (_path: string, options?: { method?: string; body?: { section_id: number } }) => {
      if (options?.method === "PATCH") {
        if (options.body?.section_id === 13) throw new Error("boom");
        return { status: "success" };
      }
      return progressPayload;
    });
    renderSheet();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Resolución de conflictos" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Proyecto en equipo" }));
    fireEvent.click(screen.getByRole("button", { name: trSettings("save") }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        tr("saveFailed", { count: 1 }),
        expect.anything(),
      ),
    );
    expect(await screen.findByText(tr("unsaved", { count: 1 }))).toBeInTheDocument();
  });

  it("is read-only without the manage permission", async () => {
    permissions.clear();
    renderSheet();
    expect(await screen.findByText(tr("readOnly"))).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Resolución de conflictos" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: trSettings("save") })).toBeNull();
  });

  it("shows an error state (not an empty list) when the progress fails to load", async () => {
    apiRequest.mockRejectedValue(new Error("down"));
    renderSheet();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});

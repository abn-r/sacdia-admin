import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import messages from "../../../messages/es.json";
import { CamporeeDeleteConfirm } from "@/components/camporees/camporee-delete-confirm";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const mockDelete = vi.fn();
const mockDeleteUnion = vi.fn();
vi.mock("@/lib/api/camporees", () => ({
  deleteCamporee: (...args: unknown[]) => mockDelete(...args),
  deleteUnionCamporee: (...args: unknown[]) => mockDeleteUnion(...args),
}));

const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: vi.fn() } }));

const t = createTranslator({
  locale: "es",
  messages,
  namespace: "evaluation.camporees.delete",
});

function renderConfirm(kind: "local" | "union", redirectTo?: string) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeDeleteConfirm
        open
        onOpenChange={() => undefined}
        kind={kind}
        camporee={{ id: 12, name: "Camporee Valle Alto 2027" }}
        redirectTo={redirectTo}
      />
    </NextIntlClientProvider>,
  );
}

describe("CamporeeDeleteConfirm", () => {
  beforeEach(() => {
    mockDelete.mockReset().mockResolvedValue({});
    mockDeleteUnion.mockReset().mockResolvedValue({});
    push.mockReset();
    refresh.mockReset();
    toastSuccess.mockReset();
  });
  afterEach(cleanup);

  it("nombra el camporee y confirma con la consecuencia", () => {
    renderConfirm("local");
    expect(
      screen.getByText(t("title", { name: "Camporee Valle Alto 2027" })),
    ).toBeVisible();
    expect(screen.getByText(t("description"))).toBeVisible();
  });

  it("elimina un camporee local y vuelve al listado", async () => {
    const user = userEvent.setup();
    renderConfirm("local", "/dashboard/campamentos");
    await user.click(screen.getByRole("button", { name: t("confirm") }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(12));
    expect(mockDeleteUnion).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/dashboard/campamentos");
    expect(toastSuccess).toHaveBeenCalledWith(messages.camporees.toasts.camporee_deleted);
  });

  it("usa el endpoint de unión y refresca si no hay redirección", async () => {
    const user = userEvent.setup();
    renderConfirm("union");
    await user.click(screen.getByRole("button", { name: t("confirm") }));
    await waitFor(() => expect(mockDeleteUnion).toHaveBeenCalledWith(12));
    expect(refresh).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith(
      messages.camporees.toasts.union_camporee_deleted,
    );
  });

  it("deja el diálogo abierto con el error si falla", async () => {
    const user = userEvent.setup();
    mockDelete.mockRejectedValue(new Error("No se pudo"));
    renderConfirm("local", "/x");
    await user.click(screen.getByRole("button", { name: t("confirm") }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo");
    expect(push).not.toHaveBeenCalled();
  });
});

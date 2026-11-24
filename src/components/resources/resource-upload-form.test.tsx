import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/resources/new",
}));
const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: vi.fn() } }));
const { createResource } = vi.hoisted(() => ({ createResource: vi.fn() }));
vi.mock("@/lib/api/resources", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/resources")>()),
  createResource,
}));

// Radix Select needs these pointer/scroll APIs, which jsdom lacks.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

import { ResourceUploadForm } from "@/components/resources/resource-upload-form";

type Props = React.ComponentProps<typeof ResourceUploadForm>;

const base: Props = {
  categories: [{ resource_category_id: 3, name: "Materiales de clase" }],
  clubTypes: [{ club_type_id: 2, name: "Conquistadores" }],
  unions: [{ union_id: 20, name: "Unión Mexicana Interoceánica", country_id: 1 }],
  localFields: [{ local_field_id: 4, name: "Asociación Valle Alto", union_id: 20 }],
  allowedScopeLevels: ["system", "division", "union", "local_field"],
  lockedScopeId: null,
};

function renderForm(props: Partial<Props> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ResourceUploadForm {...base} {...props} />
    </NextIntlClientProvider>,
  );
}

/** Step 1 as a video link, step 2 with a title, landing on step 3. */
async function goToScopeStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: "Video" }));
  await user.type(screen.getByLabelText(/URL del video/), "https://youtube.com/watch?v=abc");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await user.type(screen.getByLabelText(/^Título/), "Canto Yo iré");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

beforeEach(() => {
  createResource.mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  createResource.mockReset();
  push.mockClear();
  toastSuccess.mockClear();
});

describe("ResourceUploadForm", () => {
  it("walks Archivo, Datos and Alcance with a text stepline", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByText("Paso 1 de 3 · Archivo")).toBeInTheDocument();
    expect(screen.getByText(/Siguiente: Datos/)).toBeInTheDocument();

    await goToScopeStep(user);
    expect(screen.getByText("Paso 3 de 3 · Alcance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar recurso" })).toBeInTheDocument();
  });

  it("does not leave step 1 without a file", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Paso 1 de 3 · Archivo")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/Completa los campos requeridos/);
  });

  it("disables the levels the role does not allow and locks the territory", async () => {
    const user = userEvent.setup();
    renderForm({ allowedScopeLevels: ["union"], lockedScopeId: 20 });
    await goToScopeStep(user);

    for (const name of ["Sistema", "División", "Campo local"]) {
      expect(screen.getByRole("radio", { name })).toBeDisabled();
    }
    expect(screen.getByRole("radio", { name: "Unión" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Unión" })).toBeChecked();
    expect(screen.getByText("Tu rol puede publicar en nivel Unión.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Unión Mexicana Interoceánica")).toBeDisabled();
  });

  it("says in one sentence who will see the resource", async () => {
    const user = userEvent.setup();
    renderForm({ allowedScopeLevels: ["union"], lockedScopeId: 20 });
    await goToScopeStep(user);

    expect(screen.getByText("Todos los clubes de Unión Mexicana Interoceánica")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Tipo de club"));
    await user.click(await screen.findByRole("option", { name: "Conquistadores" }));
    expect(
      screen.getByText("Los clubes de Conquistadores de Unión Mexicana Interoceánica"),
    ).toBeInTheDocument();
  });

  it("publishes with the level and territory the role is pinned to", async () => {
    const user = userEvent.setup();
    renderForm({ allowedScopeLevels: ["union"], lockedScopeId: 20 });
    await goToScopeStep(user);

    await user.click(screen.getByRole("button", { name: "Publicar recurso" }));

    await waitFor(() => expect(createResource).toHaveBeenCalledTimes(1));
    const body = createResource.mock.calls[0]?.[0] as FormData;
    expect(body.get("scope_level")).toBe("union");
    expect(body.get("scope_id")).toBe("20");
    expect(body.get("resource_type")).toBe("video_link");
    expect(body.get("external_url")).toBe("https://youtube.com/watch?v=abc");
    expect(body.get("title")).toBe("Canto Yo iré");
    expect(toastSuccess).toHaveBeenCalledWith("Recurso publicado.");
  });

  it("asks for the territory before publishing at a lower level", async () => {
    const user = userEvent.setup();
    renderForm();
    await goToScopeStep(user);

    expect(screen.getByText("Todos los clubes de SACDIA")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Campo local" }));
    expect(screen.getByText("Elige el territorio para saber quién lo verá.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Publicar recurso" }));
    expect(screen.getByText("Paso 3 de 3 · Alcance")).toBeInTheDocument();
    expect(createResource).not.toHaveBeenCalled();
  });

  it("rejects a file over 50 MB with a message", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderForm();

    const big = new File(["x"], "enorme.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 60 * 1024 * 1024 });
    await user.upload(document.querySelector("input[type=file]") as HTMLInputElement, big);

    expect(screen.getByRole("alert")).toHaveTextContent("El archivo pesa 60.0 MB y el límite es 50 MB.");
  });
});

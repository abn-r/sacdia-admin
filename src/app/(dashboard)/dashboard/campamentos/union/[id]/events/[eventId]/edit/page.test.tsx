import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../../../../messages/es.json";

const mocks = vi.hoisted(() => ({
  loadEdit: vi.fn(),
  detailPage: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => {
    let node: unknown = messages;
    for (const part of `${namespace}.${key}`.split(".")) {
      node = (node as Record<string, unknown>)?.[part];
    }
    return typeof node === "string" ? node : `${namespace}.${key}`;
  },
}));

vi.mock("@/lib/auth/session", () => ({ requireAdminUser: vi.fn(async () => ({ id: "u1" })) }));

vi.mock("@/lib/camporee-events/event-form-data", () => ({
  loadEditCamporeeEventFormData: mocks.loadEdit,
  camporeeEventsListHref: (_scope: string, id: string) => `/dashboard/campamentos/union/${id}?tab=events`,
  resolveEventFormData: (result: { props: unknown }) => result.props,
}));

vi.mock("@/components/camporee-events/event-form-page", () => ({
  EventFormPage: () => <div data-testid="event-form" />,
}));

// The agenda page must not be rendered underneath anymore.
vi.mock("../../../page", () => ({
  default: (props: unknown) => {
    mocks.detailPage(props);
    return <div data-testid="detail-page" />;
  },
}));

import UnionCamporeeEventEditPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadEdit.mockResolvedValue({ status: "ok", props: { mode: "edit" } });
});

afterEach(() => cleanup());

describe("union camporee event edit route (direct load)", () => {
  it("renders the edit form as its own page instead of the camporee detail", async () => {
    const element = await UnionCamporeeEventEditPage({
      params: Promise.resolve({ id: "138", eventId: "14" }),
    });

    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        {element}
      </NextIntlClientProvider>,
    );

    expect(mocks.loadEdit).toHaveBeenCalledWith({ id: "u1" }, "union", "138", "14");
    expect(screen.getByRole("heading", { level: 1, name: "Editar evento" })).toBeInTheDocument();
    expect(screen.getByTestId("event-form")).toBeInTheDocument();
    expect(screen.queryByTestId("detail-page")).not.toBeInTheDocument();
    expect(mocks.detailPage).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /Volver a eventos/ })).toHaveAttribute(
      "href",
      "/dashboard/campamentos/union/138?tab=events",
    );
  });
});

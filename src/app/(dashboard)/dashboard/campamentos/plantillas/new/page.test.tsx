import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../messages/es.json";

const mocks = vi.hoisted(() => ({ listPage: vi.fn() }));

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

vi.mock("@/lib/camporee-events/event-template-form-data", () => ({
  EVENT_TEMPLATES_LIST_HREF: "/dashboard/campamentos/plantillas",
  loadCreateEventTemplateFormData: vi.fn(async () => ({ status: "ok", props: { mode: "create" } })),
  resolveEventTemplateFormData: (result: { props: unknown }) => result.props,
}));

vi.mock("@/components/camporee-events/event-template-form-page", () => ({
  EventTemplateFormPage: () => <div data-testid="template-form" />,
}));

vi.mock("../page", () => ({
  default: (props: unknown) => {
    mocks.listPage(props);
    return <div data-testid="templates-list" />;
  },
}));

import EventTemplateNewPage from "./page";

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("event template create route (direct load)", () => {
  it("renders the template form as its own page", async () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        {await EventTemplateNewPage()}
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: messages.camporeeEvents.templates.createTitle }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("template-form")).toBeInTheDocument();
    expect(screen.queryByTestId("templates-list")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Volver a plantillas/ })).toHaveAttribute(
      "href",
      "/dashboard/campamentos/plantillas",
    );
  });
});

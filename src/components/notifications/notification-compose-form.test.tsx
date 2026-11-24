import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { NotificationComposeData } from "@/lib/notifications/compose-data";

const mocks = vi.hoisted(() => ({
  direct: vi.fn(),
  broadcast: vi.fn(),
  club: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
  success: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, back: mocks.back, refresh: mocks.refresh, replace: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: vi.fn() } }));
vi.mock("@/lib/notifications/actions", () => ({
  sendDirectNotificationAction: mocks.direct,
  broadcastNotificationAction: mocks.broadcast,
  clubNotificationAction: mocks.club,
}));
vi.mock("@/components/shared/selectors/club-select", () => ({ ClubSelect: () => <div /> }));
vi.mock("@/components/units/member-combobox", () => ({ MemberCombobox: () => <div /> }));

import { NotificationComposeForm } from "./notification-compose-form";

const c = messages.people.community.notifications.compose;

function data(overrides: Partial<NotificationComposeData> = {}): NotificationComposeData {
  return {
    permissions: { person: true, club: true, everyone: true },
    clubTargets: [
      {
        clubId: 1,
        clubName: "Club Orión",
        sectionId: 2,
        sectionName: "Conquistadores",
        instanceType: "pathfinders",
        instanceId: 12,
        label: "Club Orión · Conquistadores",
      },
    ],
    clubTargetsLoadError: false,
    deviceCount: 412,
    ...overrides,
  };
}

function renderForm(props: Partial<React.ComponentProps<typeof NotificationComposeForm>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <NotificationComposeForm data={data()} {...props} />
    </NextIntlClientProvider>,
  );
}

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NotificationComposeForm", () => {
  it("offers the three audiences in the new words", () => {
    renderForm();
    const group = screen.getByRole("radiogroup", { name: c.audienceLabel });
    expect(within(group).getByRole("radio", { name: "Una persona" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "Club o sección" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "Todos" })).toBeInTheDocument();
    expect(screen.queryByText("Difusión general")).toBeNull();
  });

  it("only lists the audiences the user may send to", () => {
    renderForm({ data: data({ permissions: { person: true, club: false, everyone: false } }) });
    expect(screen.queryByRole("radiogroup", { name: c.audienceLabel })).toBeNull();
  });

  it("previews the push as it is typed", async () => {
    renderForm();
    const preview = screen.getByTestId("push-preview");
    expect(preview).toHaveTextContent(c.previewTitlePlaceholder);

    await userEvent.type(screen.getByLabelText(messages.notifications.forms.label_title), "Cambio de horario");
    await userEvent.type(screen.getByLabelText(messages.notifications.forms.label_body), "La reunión empieza a las 19:00.");
    expect(preview).toHaveTextContent("Cambio de horario");
    expect(preview).toHaveTextContent("La reunión empieza a las 19:00.");
  });

  it("blocks sending an empty message and says what is missing", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: c.submit }));
    expect(await screen.findByText(messages.notifications.validation.user_id_required)).toBeInTheDocument();
    expect(screen.getByText(messages.notifications.validation.title_required)).toBeInTheDocument();
    expect(mocks.direct).not.toHaveBeenCalled();
  });

  it("asks for confirmation with the device count before sending to everyone", async () => {
    mocks.broadcast.mockResolvedValue({ success: "ok" });
    renderForm();
    await userEvent.click(screen.getByRole("radio", { name: "Todos" }));
    expect(screen.getByText(/Llega a los 412 dispositivos/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(messages.notifications.forms.label_title), "Inscripciones 2027 abiertas");
    await userEvent.type(screen.getByLabelText(messages.notifications.forms.label_body), "Ya puedes inscribir.");
    await userEvent.click(screen.getByRole("button", { name: c.submitEveryone }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/«Inscripciones 2027 abiertas» llegará a 412 dispositivos/)).toBeInTheDocument();
    expect(mocks.broadcast).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Enviar a 412 dispositivos" }));
    await waitFor(() => expect(mocks.broadcast).toHaveBeenCalledTimes(1));
    const formData = mocks.broadcast.mock.calls[0]![1] as FormData;
    expect(formData.get("title")).toBe("Inscripciones 2027 abiertas");
  });

  it("does not invent a device count when the API could not give it", async () => {
    renderForm({ data: data({ deviceCount: null }) });
    await userEvent.click(screen.getByRole("radio", { name: "Todos" }));
    expect(screen.getByText(c.everyoneWarningNoCount)).toBeInTheDocument();
  });

  it("blocks the club audience when its targets failed to load", async () => {
    renderForm({ data: data({ clubTargetsLoadError: true }), initialAudience: "club" });
    expect(screen.getByRole("alert")).toHaveTextContent(messages.notifications.forms.club_targets_load_error);
    expect(screen.getByRole("button", { name: c.submit })).toBeDisabled();
  });
});

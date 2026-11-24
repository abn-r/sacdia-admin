import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { CamporeeFormPage } from "@/components/camporees/camporee-form-page";
import { normalizeCamporee } from "@/lib/camporees/normalize";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockCreateUnion = vi.fn();
const mockUpdateUnion = vi.fn();
vi.mock("@/lib/api/camporees", () => ({
  createCamporee: (...a: unknown[]) => mockCreate(...a),
  updateCamporee: (...a: unknown[]) => mockUpdate(...a),
  createUnionCamporee: (...a: unknown[]) => mockCreateUnion(...a),
  updateUnionCamporee: (...a: unknown[]) => mockUpdateUnion(...a),
}));

const mockOrdersSettings = vi.fn();
const mockOrdersReplace = vi.fn();
vi.mock("@/lib/api/camporee-orders", () => ({
  getCamporeeOrderOfferings: vi.fn().mockResolvedValue({
    settings: { orders_enabled: false, orders_opens_at: null, orders_deadline: null },
    items: [],
  }),
  listCamporeeOrderProducts: vi.fn().mockResolvedValue([
    { camporee_order_product_id: "prod-1", title: "Playera oficial" },
  ]),
  updateCamporeeOrderSettings: (...a: unknown[]) => mockOrdersSettings(...a),
  replaceCamporeeOrderOfferings: (...a: unknown[]) => mockOrdersReplace(...a),
}));

vi.mock("@/components/shared/location-picker", () => ({
  LocationPicker: ({
    onLocationChange,
  }: {
    onLocationChange?: (v: { lat: number; lng: number; address: string } | null) => void;
  }) => (
    <button
      type="button"
      onClick={() => onLocationChange?.({ lat: 19.17, lng: -96.13, address: "Rancho El Encino" })}
    >
      mock-set-pin
    </button>
  ),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastInfo = vi.fn();
vi.mock("sonner", () => {
  const toast = Object.assign((m: string) => toastInfo(m), {
    success: (m: string) => toastSuccess(m),
    error: (m: string, o?: unknown) => toastError(m, o),
  });
  return { toast };
});

const stored = normalizeCamporee(
  {
    local_camporee_id: 12,
    name: "Camporee Valle Alto 2027",
    start_date: "2027-02-10T00:00:00.000Z",
    end_date: "2027-02-12T00:00:00.000Z",
    club_registration_deadline: "2027-01-20T23:59:00.000Z",
    member_registration_deadline: "2027-01-31T23:59:00.000Z",
    payment_deadline: "2027-02-05T23:59:00.000Z",
    agenda_visible_from: "2027-02-01T08:00:00.000Z",
    local_camporee_place: "Rancho El Encino",
    local_field_id: 4,
    registration_cost: 450,
  },
  "local",
);

function renderForm(props: Partial<React.ComponentProps<typeof CamporeeFormPage>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeFormPage
        kind="local"
        camporee={null}
        owners={[{ value: 4, label: "Asociación Valle Alto" }]}
        ownerLocked={false}
        defaultOwnerId={4}
        canConfigureOrders={false}
        cancelHref="/dashboard/campamentos"
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

const tf = messages.camporees.form;
const tVal = messages.camporees.validation;

describe("CamporeeFormPage", () => {
  beforeEach(() => {
    for (const m of [mockCreate, mockUpdate, mockCreateUnion, mockUpdateUnion, mockOrdersSettings, mockOrdersReplace]) {
      m.mockReset().mockResolvedValue({ data: { local_camporee_id: 77 } });
    }
    push.mockReset();
    refresh.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    toastInfo.mockReset();
  });
  afterEach(cleanup);

  it("shows the required-field errors without calling the API", async () => {
    const user = userEvent.setup();
    renderForm({ defaultOwnerId: null });
    await user.click(screen.getByRole("button", { name: tf.createCamporee }));
    expect(await screen.findByText(tVal.name_required)).toBeVisible();
    expect(screen.getByText(tVal.start_date_required)).toBeVisible();
    expect(screen.getByText(tVal.place_required)).toBeVisible();
    expect(screen.getByText(tVal.local_field_required)).toBeVisible();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates the camporee and opens its detail", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(new RegExp(`^${tf.labelName}`)), "Camporee 2027");
    await user.type(screen.getByLabelText(new RegExp(`^${tf.labelStartDate}`)), "2027-02-10");
    await user.type(screen.getByLabelText(new RegExp(`^${tf.labelEndDate}`)), "2027-02-12");
    await user.type(screen.getByLabelText(new RegExp(`^${tf.labelPlace}`)), "Rancho");
    await user.click(screen.getByRole("button", { name: tf.createCamporee }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      name: "Camporee 2027",
      local_field_id: 4,
      local_camporee_place: "Rancho",
      includes_pathfinders: true,
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/campamentos/77"));
    expect(toastSuccess).toHaveBeenCalledWith(messages.camporees.toasts.camporee_created);
  });

  it("edit sends only the changed field and never the deadlines it did not touch", async () => {
    const user = userEvent.setup();
    renderForm({ camporee: stored, cancelHref: "/dashboard/campamentos/12" });

    // The stored deadlines are shown, not blanked.
    expect(screen.getByLabelText(tf.labelPaymentDeadline)).not.toHaveValue("");
    expect(screen.getByLabelText(tf.labelAgendaVisibleFrom)).not.toHaveValue("");

    const name = screen.getByLabelText(new RegExp(`^${tf.labelName}`));
    await user.clear(name);
    await user.type(name, "Camporee Valle Alto 2027 (final)");
    await user.click(screen.getByRole("button", { name: tf.saveChanges }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith(12, { name: "Camporee Valle Alto 2027 (final)" });
    expect(mockCreate).not.toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/campamentos/12"));
  });

  it("clearing a deadline on purpose sends null for that deadline only", async () => {
    const user = userEvent.setup();
    renderForm({ camporee: stored });
    await user.clear(screen.getByLabelText(tf.labelPaymentDeadline));
    await user.click(screen.getByRole("button", { name: tf.saveChanges }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(12, { payment_deadline: null }));
  });

  it("does not call the API when nothing changed", async () => {
    const user = userEvent.setup();
    renderForm({ camporee: stored });
    await user.click(screen.getByRole("button", { name: tf.saveChanges }));
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(toastInfo).toHaveBeenCalledWith(tVal.no_changes);
  });

  it("uses the union endpoints for a union camporee", async () => {
    const user = userEvent.setup();
    const union = normalizeCamporee(
      {
        union_camporee_id: 3,
        name: "Camporee de Unión",
        start_date: "2027-04-17",
        end_date: "2027-04-18",
        union_camporee_place: "Parque del Lago",
        union_id: 9,
      },
      "union",
    );
    renderForm({ kind: "union", camporee: union, owners: [{ value: 9, label: "Unión Norte" }] });
    await user.type(screen.getByLabelText(new RegExp(`^${tf.labelDescription}`)), "Para clubes");
    await user.click(screen.getByRole("button", { name: tf.saveChanges }));
    await waitFor(() =>
      expect(mockUpdateUnion).toHaveBeenCalledWith(3, { description: "Para clubes" }),
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("saves the order settings together with the camporee", async () => {
    const user = userEvent.setup();
    renderForm({ camporee: stored, canConfigureOrders: true });

    const enabled = await screen.findByLabelText(messages.camporee_orders.settings.enabled);
    await user.click(enabled);
    await user.click(screen.getByRole("button", { name: tf.saveChanges }));

    await waitFor(() => expect(mockOrdersSettings).toHaveBeenCalledTimes(1));
    expect(mockOrdersSettings.mock.calls[0]?.slice(0, 2)).toEqual([12, "local"]);
    expect(mockOrdersSettings.mock.calls[0]?.[2]).toMatchObject({ orders_enabled: true });
    expect(mockOrdersReplace).toHaveBeenCalled();
    // The camporee itself had no changes: it is not patched.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("sends the map pin as a coordinate pair", async () => {
    const user = userEvent.setup();
    renderForm({ camporee: stored });
    await user.click(screen.getByRole("button", { name: "mock-set-pin" }));
    await user.click(screen.getByRole("button", { name: tf.saveChanges }));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(12, { lat: 19.17, long: -96.13 }),
    );
  });

  it("cancel goes back without saving", async () => {
    const user = userEvent.setup();
    renderForm({ cancelHref: "/dashboard/campamentos" });
    await user.click(screen.getByRole("button", { name: messages.shared.kit.sectionForm.cancel }));
    expect(push).toHaveBeenCalledWith("/dashboard/campamentos");
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

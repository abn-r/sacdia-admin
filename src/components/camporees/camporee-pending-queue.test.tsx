import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import messages from "../../../messages/es.json";
import { CamporeePendingQueue } from "@/components/camporees/camporee-pending-queue";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const api = vi.hoisted(() => ({
  approveCamporeeMember: vi.fn(),
  approveUnionCamporeeMember: vi.fn(),
  rejectCamporeeMember: vi.fn(),
  rejectUnionCamporeeMember: vi.fn(),
  approveCamporeeClub: vi.fn(),
  approveUnionCamporeeClub: vi.fn(),
  rejectCamporeeClub: vi.fn(),
  rejectUnionCamporeeClub: vi.fn(),
}));
vi.mock("@/lib/api/camporees", () => api);

const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: vi.fn() } }));

const t = createTranslator({ locale: "es", messages, namespace: "evaluation.camporees.pending" });

const pending = {
  members: [
    {
      user_id: "u-1",
      camporee_member_id: 31,
      name: "Camila Ibarra",
      club_name: "Club Orión",
      insurance_status: "verified",
    },
  ],
  clubs: [
    {
      camporee_club_id: 9,
      camporee_id: 1,
      club_section_id: 4,
      section_name: "Club Faro · Conquistadores",
      registered_by_name: "Elena Paredes",
    },
  ],
  payments: [],
};

function renderQueue(props: Partial<React.ComponentProps<typeof CamporeePendingQueue>> = {}) {
  const onChanged = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeePendingQueue
        camporeeId={73}
        isUnionCamporee={false}
        pending={pending}
        onChanged={onChanged}
        {...props}
      />
    </NextIntlClientProvider>,
  );
  return { onChanged };
}

describe("CamporeePendingQueue", () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset().mockResolvedValue({});
    toastSuccess.mockReset();
  });
  afterEach(cleanup);

  it("says nothing is waiting instead of rendering empty tables", () => {
    renderQueue({ pending: { members: [], clubs: [], payments: [] } });
    expect(screen.getByText(t("emptyTitle"))).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("approving a member asks first, then approves and refreshes", async () => {
    const user = userEvent.setup();
    const { onChanged } = renderQueue();
    await user.click(screen.getAllByRole("button", { name: t("approve") })[0] as HTMLElement);
    expect(api.approveCamporeeMember).not.toHaveBeenCalled();
    expect(screen.getByText(t("approveTitle", { name: "Camila Ibarra" }))).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: t("approve") }).at(-1) as HTMLElement);
    await waitFor(() => expect(api.approveCamporeeMember).toHaveBeenCalledWith(73, 31));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("uses the union endpoint for a union camporee", async () => {
    const user = userEvent.setup();
    renderQueue({ isUnionCamporee: true });
    await user.click(screen.getAllByRole("button", { name: t("approve") })[0] as HTMLElement);
    await user.click(screen.getAllByRole("button", { name: t("approve") }).at(-1) as HTMLElement);
    await waitFor(() => expect(api.approveUnionCamporeeMember).toHaveBeenCalledWith(73, 31));
    expect(api.approveCamporeeMember).not.toHaveBeenCalled();
  });

  it("rejecting needs a reason and sends it", async () => {
    const user = userEvent.setup();
    const { onChanged } = renderQueue();
    await user.click(screen.getAllByRole("button", { name: t("reject") })[0] as HTMLElement);
    const box = await screen.findByRole("textbox");
    await user.type(box, "Sin seguro vigente");
    await user.click(screen.getAllByRole("button", { name: t("reject") }).at(-1) as HTMLElement);
    await waitFor(() =>
      expect(api.rejectCamporeeMember).toHaveBeenCalledWith(73, 31, {
        rejection_reason: "Sin seguro vigente",
      }),
    );
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("approves a club section through the club endpoint", async () => {
    const user = userEvent.setup();
    renderQueue({ pending: { ...pending, members: [] } });
    await user.click(screen.getAllByRole("button", { name: t("approve") })[0] as HTMLElement);
    await user.click(screen.getAllByRole("button", { name: t("approve") }).at(-1) as HTMLElement);
    await waitFor(() => expect(api.approveCamporeeClub).toHaveBeenCalledWith(73, 9));
  });
});

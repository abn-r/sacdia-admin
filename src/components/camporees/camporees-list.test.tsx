import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import messages from "../../../messages/es.json";
import { CamporeesList, type CamporeesListProps } from "@/components/camporees/camporees-list";
import { toLocalListRow, toUnionListRow } from "@/lib/camporees/list";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/campamentos",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/api/camporees", () => ({
  deleteCamporee: vi.fn(),
  deleteUnionCamporee: vi.fn(),
}));

const t = createTranslator({ locale: "es", messages, namespace: "evaluation.camporees.list" });

const upcoming = toLocalListRow({
  local_camporee_id: 1,
  name: "Camporee Valle Alto 2027",
  start_date: "2027-02-10",
  end_date: "2027-02-12",
  local_camporee_place: "Rancho El Encino",
});
const closed = toLocalListRow({
  local_camporee_id: 2,
  name: "Camporee de Aventureros 2027",
  start_date: "2027-04-17",
  end_date: "2027-04-18",
  club_registration_closed_at: "2027-03-01T00:00:00Z",
});
const past = toLocalListRow({
  local_camporee_id: 3,
  name: "Camporee Valle Alto 2026",
  start_date: "2026-02-12",
  end_date: "2026-02-14",
});

function renderList(props: Partial<CamporeesListProps> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeesList
        kind="local"
        rows={[upcoming, closed, past]}
        failure={null}
        pagination={{ page: 1, totalPages: 1, total: 3, limit: 20 }}
        canCreate
        canEdit
        canDelete
        today="2027-01-15"
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("CamporeesList", () => {
  afterEach(cleanup);

  it("shows upcoming camporees by default and marks only the exception", () => {
    renderList();
    const table = screen.getAllByRole("table")[0] as HTMLElement;
    expect(within(table).getByText("Camporee Valle Alto 2027")).toBeInTheDocument();
    expect(within(table).queryByText("Camporee Valle Alto 2026")).toBeNull();
    // "Abierta" is the normal value: nothing is printed for it.
    expect(within(table).queryByText(t("registration.open"))).toBeNull();
    expect(within(table).getByText(t("registration.closed"))).toBeInTheDocument();
  });

  it("an error never looks like an empty list", () => {
    renderList({ rows: [], failure: { kind: "error", detail: { code: 500 } } });
    expect(screen.getAllByText(t("loadFailedTitle")).length).toBeGreaterThan(0);
    expect(screen.queryByText(t("emptyLocalTitle"))).toBeNull();
  });

  it("shows the empty state with a create action when there are no camporees", () => {
    renderList({ rows: [], pagination: { page: 1, totalPages: 1, total: 0, limit: 20 } });
    expect(screen.getByText(t("emptyLocalTitle"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: messages.camporees.list.newCamporee })).toHaveAttribute(
      "href",
      "/dashboard/campamentos/new",
    );
  });

  it("filters by text and offers to clear when nothing matches", async () => {
    const user = userEvent.setup();
    renderList();
    await user.type(screen.getByLabelText(t("searchLabel")), "zzz");
    expect(screen.getByText(t("noResultsTitle"))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: t("clearFilters") }));
    expect(screen.queryByText(t("noResultsTitle"))).toBeNull();
  });

  it("offers Editar on local rows (the old list had none) and hides it without permission", async () => {
    const user = userEvent.setup();
    const { unmount } = renderList();
    await user.click(
      screen.getAllByRole("button", { name: /Acciones de Camporee Valle Alto 2027/ })[0] as HTMLElement,
    );
    const edit = await screen.findByRole("menuitem", { name: messages.camporees.unionList.editLabel });
    expect(edit).toHaveAttribute("href", "/dashboard/campamentos/1/edit");
    unmount();

    renderList({ canEdit: false, canDelete: false });
    await user.click(
      screen.getAllByRole("button", { name: /Acciones de Camporee Valle Alto 2027/ })[0] as HTMLElement,
    );
    expect(screen.queryByRole("menuitem", { name: messages.camporees.unionList.editLabel })).toBeNull();
  });

  it("union rows link to the union detail and edit", async () => {
    const user = userEvent.setup();
    const union = toUnionListRow({
      union_camporee_id: 5,
      name: "Camporee de Unión 2027",
      start_date: "2027-05-01",
      end_date: "2027-05-03",
      union_name: "Unión Norte",
    });
    renderList({ kind: "union", rows: [union] });
    const link = screen.getAllByRole("link", { name: "Camporee de Unión 2027" })[0];
    expect(link).toHaveAttribute("href", "/dashboard/campamentos/union/5");
    await user.click(screen.getAllByRole("button", { name: /Acciones de Camporee de Unión 2027/ })[0] as HTMLElement);
    expect(await screen.findByRole("menuitem", { name: messages.camporees.unionList.editLabel })).toHaveAttribute(
      "href",
      "/dashboard/campamentos/union/5/edit",
    );
  });
});

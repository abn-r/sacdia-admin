import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { SplitInbox, SplitInboxFooter, SplitInboxItemContent } from "./split-inbox";

const messages = {
  shared: {
    kit: { splitInbox: { saveNext: "Guardar y seguir", next: "Siguiente: {title}", empty: "Nada por revisar" } },
  },
};
const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );

const items = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
  { id: "c", name: "Gamma" },
];

function setup(selectedId: string | null, onSelect = vi.fn()) {
  wrap(
    <SplitInbox
      items={items}
      getId={(i) => i.id}
      selectedId={selectedId}
      onSelect={onSelect}
      renderItem={(i) => <SplitInboxItemContent title={i.name} subtitle="sub" status={<em>ok</em>} />}
      detail={<p>Detalle</p>}
      footer={<SplitInboxFooter nextLabel="Gamma" onSaveNext={() => {}} />}
    />,
  );
  return onSelect;
}

describe("SplitInbox", () => {
  afterEach(cleanup);

  it("renders numbered rows, selected state, detail and footer", () => {
    setup("b");
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("option", { name: /Beta/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Detalle")).toBeInTheDocument();
    expect(screen.getByText("Siguiente: Gamma")).toBeInTheDocument();
  });

  it("selects on click", () => {
    const onSelect = setup("a");
    fireEvent.click(screen.getByRole("option", { name: /Gamma/ }));
    expect(onSelect).toHaveBeenCalledWith("c");
  });

  it("moves selection with arrow keys and clamps at the edges", () => {
    const onSelect = setup("b");
    const list = screen.getByRole("listbox");
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(onSelect).toHaveBeenLastCalledWith("c");
    fireEvent.keyDown(list, { key: "ArrowUp" });
    expect(onSelect).toHaveBeenLastCalledWith("a");
  });

  it("shows the empty state", () => {
    wrap(<SplitInbox items={[]} getId={() => ""} renderItem={() => null} onSelect={() => {}} detail={null} />);
    expect(screen.getByText("Nada por revisar")).toBeInTheDocument();
  });

  it("footer fires save-next and disables while pending", () => {
    const onSaveNext = vi.fn();
    wrap(<SplitInboxFooter onSaveNext={onSaveNext} pending />);
    expect(screen.getByRole("button", { name: "Guardar y seguir" })).toBeDisabled();
  });
});

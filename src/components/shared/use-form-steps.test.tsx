import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useFormSteps } from "./use-form-steps";

let api: ReturnType<typeof useFormSteps>;

function Harness() {
  api = useFormSteps(2);
  return (
    <form noValidate>
      <div ref={api.stepRef(0)} hidden={api.step !== 0} data-testid="step-0">
        <input name="title" />
      </div>
      <div ref={api.stepRef(1)} hidden={api.step !== 1} data-testid="step-1">
        <input name="max_points" />
        <button type="button" id="event_type_id">
          type
        </button>
        <input type="hidden" name="mode" />
      </div>
    </form>
  );
}

async function flushFrame() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

describe("useFormSteps.goToField", () => {
  afterEach(cleanup);

  it("switches to the step holding the field and focuses it", async () => {
    render(<Harness />);
    expect(api.step).toBe(0);

    let found = false;
    act(() => {
      found = api.goToField("max_points");
    });
    await flushFrame();

    expect(found).toBe(true);
    expect(api.step).toBe(1);
    expect(api.direction).toBe("forward");
    expect(document.activeElement).toBe(document.querySelector('[name="max_points"]'));
  });

  it("falls back to the element id", async () => {
    render(<Harness />);
    act(() => {
      api.goToField("event_type_id");
    });
    await flushFrame();

    expect(api.step).toBe(1);
    expect(document.activeElement).toBe(document.getElementById("event_type_id"));
  });

  it("focuses a visible sibling for hidden inputs", async () => {
    render(<Harness />);
    act(() => {
      api.goToField("mode");
    });
    await flushFrame();

    expect(api.step).toBe(1);
    expect(screen.getByTestId("step-1")).toContainElement(document.activeElement as HTMLElement);
  });

  it("returns false and keeps the step for unknown fields", () => {
    render(<Harness />);
    let found = true;
    act(() => {
      found = api.goToField("nope");
    });
    expect(found).toBe(false);
    expect(api.step).toBe(0);
  });
});

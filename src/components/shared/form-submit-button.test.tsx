import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useActionState } from "react";
import { FormSubmitButton } from "./form-submit-button";

function Harness({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [, formAction] = useActionState(async (_prev: null, formData: FormData) => {
    await action(formData);
    return null;
  }, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value="7" />
      <FormSubmitButton variant="destructive">Deactivate</FormSubmitButton>
    </form>
  );
}

describe("FormSubmitButton", () => {
  afterEach(cleanup);

  it("invokes the form action when clicked", async () => {
    const action = vi.fn(async () => {});
    render(<Harness action={action} />);

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData = (action.mock.calls[0] as unknown as [FormData])[0];
    expect(formData.get("id")).toBe("7");
  });

  it("is enabled before submit and shows loading while the action is pending", async () => {
    let release: () => void = () => {};
    const action = vi.fn(
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    render(<Harness action={action} />);

    const button = screen.getByRole("button", { name: "Deactivate" });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute("data-loading");

    fireEvent.click(button);

    await waitFor(() => expect(button).toHaveAttribute("data-loading"));
    expect(action).toHaveBeenCalledTimes(1);

    release();
    await waitFor(() => expect(button).not.toHaveAttribute("data-loading"));
  });
});

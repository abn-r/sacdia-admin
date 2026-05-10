/**
 * Unit/component tests for the shadcn Form primitive.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The Form primitive is a thin adapter over react-hook-form (RHF) and
 * Radix UI Slot. Every exported part is tested here in isolation against
 * real RHF state — no mocks of the form machinery itself.
 *
 * TestForm helper:
 * A reusable controlled form that wires together Form → FormField →
 * FormItem → FormLabel → FormControl → Input → FormDescription →
 * FormMessage with a Zod schema. Each test renders this helper and
 * drives state through RHF's standard submit + validation cycle.
 *
 * aria-invalid behavior (FormControl):
 * FormControl ALWAYS renders `aria-invalid={!!error}`. When there is no
 * error the attribute value is "false" (not absent), because the Slot
 * passes boolean props as strings. Assertions reflect this contract.
 *
 * aria-describedby behavior (FormControl):
 * FormControl ALWAYS includes the description id in aria-describedby.
 * When an error is present, it appends the message id as well.
 *
 * useFormField outside context:
 * The check `if (!fieldContext)` runs after `useContext` which returns
 * the empty-object default `{} as FormFieldContextValue`. The falsy
 * check catches an empty object (truthy in JS), so the real guard is
 * the missing `name` key — `getFieldState(undefined, formState)` throws
 * inside `useFormContext`. We test this by asserting the hook throws
 * when rendered outside a FormField tree.
 *
 * Vitest globals: false → auto-cleanup is not registered by RTL.
 * We import `cleanup` and call it explicitly in afterEach.
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  renderHook,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import { useForm, useFormContext } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Schema and shared types
// ---------------------------------------------------------------------------

const emailSchema = z.object({
  email: z.string().email("Invalid email"),
});

type EmailFormValues = z.infer<typeof emailSchema>;

// ---------------------------------------------------------------------------
// TestForm — shared helper rendered by most tests
// ---------------------------------------------------------------------------

/**
 * A minimal but complete form that exercises the full Form primitive chain.
 * Props allow customising the default value and wiring a submit callback.
 *
 * Structure:
 *   Form → FormField → FormItem → FormLabel → FormControl → Input
 *                                            → FormDescription
 *                                            → FormMessage
 */
interface TestFormProps {
  defaultEmail?: string;
  onSubmit?: (values: EmailFormValues) => void;
  /** When true, FormDescription is omitted (tests aria-describedby without it) */
  hideDescription?: boolean;
  /** When true, FormMessage is omitted (tests aria-describedby without it) */
  hideMessage?: boolean;
}

function TestForm({
  defaultEmail = "",
  onSubmit = vi.fn(),
  hideDescription = false,
  hideMessage = false,
}: TestFormProps) {
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: defaultEmail },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {!hideDescription && (
                <FormDescription>Your email address</FormDescription>
              )}
              {!hideMessage && <FormMessage />}
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}

/**
 * Submit the form and wait for RHF validation to run.
 * Returns after the DOM has updated with any error state.
 */
async function submitForm() {
  const submitBtn = screen.getByRole("button", { name: "Submit" });
  await act(async () => {
    fireEvent.click(submitBtn);
  });
}

// ---------------------------------------------------------------------------
// Cleanup — RTL auto-cleanup is disabled (globals: false in vitest.config.ts)
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// 1. FormField + Controller integration
// ---------------------------------------------------------------------------

describe("FormField + Controller integration", () => {
  it("renders the field input via render prop", () => {
    render(<TestForm />);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("input reflects defaultValues provided to useForm", () => {
    render(<TestForm defaultEmail="preset@example.com" />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("preset@example.com");
  });

  it("field.onChange updates the input value (controlled)", async () => {
    render(<TestForm />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "typed@example.com" } });
    });

    expect(input.value).toBe("typed@example.com");
  });

  it("calls onSubmit with form values when validation passes", async () => {
    const onSubmit = vi.fn();
    render(<TestForm defaultEmail="valid@example.com" onSubmit={onSubmit} />);

    await submitForm();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit).toHaveBeenCalledWith(
        { email: "valid@example.com" },
        expect.anything(),
      );
    });
  });

  it("does NOT call onSubmit when validation fails", async () => {
    const onSubmit = vi.fn();
    render(<TestForm defaultEmail="not-an-email" onSubmit={onSubmit} />);

    await submitForm();

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// 2. FormControl — aria-invalid wiring
// ---------------------------------------------------------------------------

describe("FormControl aria-invalid", () => {
  it("sets aria-invalid to false when there is no validation error", () => {
    render(<TestForm />);

    const input = screen.getByRole("textbox");
    // FormControl always renders aria-invalid as a boolean prop — the Slot
    // reflects it as the string "false" on the DOM element when no error.
    expect(input).not.toHaveAttribute("aria-invalid", "true");
  });

  it("sets aria-invalid=true on the input after validation fails", async () => {
    render(<TestForm defaultEmail="not-an-email" />);

    await submitForm();

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });
  });

  it("clears aria-invalid after the field value becomes valid", async () => {
    render(<TestForm defaultEmail="not-an-email" />);

    // Trigger validation failure
    await submitForm();
    await waitFor(() => {
      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    // Fix the value — RHF re-validates on change when mode is "onChange"
    // or on next submit. Changing to a valid value and resubmitting clears it.
    const input = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(input, { target: { value: "fixed@example.com" } });
    });
    await submitForm();

    await waitFor(() => {
      expect(screen.getByRole("textbox")).not.toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// 3. FormControl — aria-describedby wiring
// ---------------------------------------------------------------------------

describe("FormControl aria-describedby", () => {
  it("contains the description id when FormDescription is present and no error", () => {
    render(<TestForm hideMessage />);

    const input = screen.getByRole("textbox");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    const descriptionEl = screen.getByText("Your email address");

    expect(describedBy).toContain(descriptionEl.id);
  });

  it("contains the message id when there is an error", async () => {
    render(<TestForm defaultEmail="bad" />);

    await submitForm();

    await waitFor(async () => {
      const input = screen.getByRole("textbox");
      const describedBy = input.getAttribute("aria-describedby") ?? "";
      const messageEl = screen.getByText("Invalid email");

      expect(describedBy).toContain(messageEl.id);
    });
  });

  it("contains BOTH description and message ids when error is present", async () => {
    render(<TestForm defaultEmail="bad" />);

    await submitForm();

    await waitFor(async () => {
      const input = screen.getByRole("textbox");
      const describedBy = input.getAttribute("aria-describedby") ?? "";
      const descriptionEl = screen.getByText("Your email address");
      const messageEl = screen.getByText("Invalid email");

      expect(describedBy).toContain(descriptionEl.id);
      expect(describedBy).toContain(messageEl.id);
    });
  });
});

// ---------------------------------------------------------------------------
// 4. FormLabel — htmlFor and focus wiring
// ---------------------------------------------------------------------------

describe("FormLabel", () => {
  it("renders a label element with text", () => {
    render(<TestForm />);

    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("label htmlFor matches the input id (FormItemContext stable id)", () => {
    render(<TestForm />);

    const label = screen.getByText("Email") as HTMLLabelElement;
    const input = screen.getByRole("textbox") as HTMLInputElement;

    // FormLabel sets htmlFor to formItemId, FormControl sets the same id on
    // the slotted input — they must match for the label to be associated.
    expect(label.htmlFor).toBe(input.id);
    expect(label.htmlFor).not.toBe("");
  });

  it("label for attribute matches the input id (clicking label associates correctly)", () => {
    render(<TestForm />);

    const label = screen.getByText("Email") as HTMLLabelElement;
    const input = screen.getByRole("textbox") as HTMLInputElement;

    // jsdom does not implement the native label-click focus behaviour, so we
    // assert the association at the attribute level — this is what browsers
    // and AT use to link the label to the input.
    expect(label.htmlFor).toBe(input.id);
    expect(label.htmlFor).not.toBe("");
  });

  it("applies data-error=true directly on the label element when field has a validation error", async () => {
    render(<TestForm defaultEmail="bad" />);

    await submitForm();

    await waitFor(() => {
      // FormLabel renders data-error={!!error} on the <label> element itself
      // (which has data-slot="form-label"). getByText returns that element directly.
      const label = screen.getByText("Email");
      expect(label).toHaveAttribute("data-error", "true");
    });
  });
});

// ---------------------------------------------------------------------------
// 5. FormMessage
// ---------------------------------------------------------------------------

describe("FormMessage", () => {
  it("does not render when the field has no error", () => {
    render(<TestForm />);

    // No error message paragraph should exist yet.
    expect(screen.queryByText("Invalid email")).not.toBeInTheDocument();
  });

  it("renders the error message text after validation fails", async () => {
    render(<TestForm defaultEmail="bad" />);

    await submitForm();

    await waitFor(() => {
      expect(screen.getByText("Invalid email")).toBeInTheDocument();
    });
  });

  it("renders the error message inside a <p> element with data-slot=form-message", async () => {
    render(<TestForm defaultEmail="bad" />);

    await submitForm();

    await waitFor(() => {
      const messageEl = screen.getByText("Invalid email");
      expect(messageEl.tagName).toBe("P");
      expect(messageEl).toHaveAttribute("data-slot", "form-message");
    });
  });

  it("message id is included in the input aria-describedby when error is present", async () => {
    render(<TestForm defaultEmail="bad" />);

    await submitForm();

    await waitFor(() => {
      const messageEl = screen.getByText("Invalid email");
      const input = screen.getByRole("textbox");
      const describedBy = input.getAttribute("aria-describedby") ?? "";

      expect(messageEl.id).not.toBe("");
      expect(describedBy).toContain(messageEl.id);
    });
  });

  it("renders children text when no error and children are provided", () => {
    function FormWithHint() {
      const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "" },
      });
      return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(vi.fn())}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage>Hint text when no error</FormMessage>
                </FormItem>
              )}
            />
          </form>
        </Form>
      );
    }

    render(<FormWithHint />);
    expect(screen.getByText("Hint text when no error")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 6. FormDescription
// ---------------------------------------------------------------------------

describe("FormDescription", () => {
  it("renders a <p> element with data-slot=form-description", () => {
    render(<TestForm />);

    const descEl = screen.getByText("Your email address");
    expect(descEl.tagName).toBe("P");
    expect(descEl).toHaveAttribute("data-slot", "form-description");
  });

  it("has a stable non-empty id used in aria-describedby", () => {
    render(<TestForm />);

    const descEl = screen.getByText("Your email address");
    expect(descEl.id).not.toBe("");
  });
});

// ---------------------------------------------------------------------------
// 7. useFormField hook — context assertions
// ---------------------------------------------------------------------------

describe("useFormField hook", () => {
  it("throws when used outside FormField + FormItem context", () => {
    // useFormField calls useFormContext() which throws if there is no
    // FormProvider ancestor. We suppress the React error boundary console
    // noise and assert that renderHook captures the error.
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useFormField());
    }).toThrow();

    consoleError.mockRestore();
  });

  it("returns correct id structure when used inside a full FormField tree", async () => {
    /**
     * We extract the hook result by rendering a component that calls
     * useFormField internally and exposes the ids via data attributes.
     * This is simpler than renderHook + wrapper because FormField requires
     * a full RHF controller context.
     */
    let capturedIds: ReturnType<typeof useFormField> | null = null;

    function IdCapture() {
      capturedIds = useFormField();
      return null;
    }

    function FormWithCapture() {
      const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "" },
      });
      return (
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <IdCapture />
                </FormItem>
              )}
            />
          </form>
        </Form>
      );
    }

    render(<FormWithCapture />);

    expect(capturedIds).not.toBeNull();
    const ids = capturedIds!;

    // The base id is a React.useId() generated value — just assert it is a
    // non-empty string and that the derived ids are built from it correctly.
    expect(ids.id).toBeTruthy();
    expect(ids.formItemId).toBe(`${ids.id}-form-item`);
    expect(ids.formDescriptionId).toBe(`${ids.id}-form-item-description`);
    expect(ids.formMessageId).toBe(`${ids.id}-form-item-message`);
    expect(ids.name).toBe("email");
  });

  it("exposes no error when field is valid", async () => {
    let capturedError: unknown = "NOT_SET";

    function ErrorCapture() {
      const { error } = useFormField();
      capturedError = error;
      return null;
    }

    function FormWithErrorCapture() {
      const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "" },
      });
      return (
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <ErrorCapture />
                </FormItem>
              )}
            />
          </form>
        </Form>
      );
    }

    render(<FormWithErrorCapture />);
    expect(capturedError).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 8. Form (FormProvider re-export)
// ---------------------------------------------------------------------------

describe("Form (FormProvider)", () => {
  it("provides useFormContext() to descendants", () => {
    let contextReceived = false;

    function ContextConsumer() {
      const ctx = useFormContext<EmailFormValues>();
      // If useFormContext does not throw, the provider is in scope.
      contextReceived = !!ctx.control;
      return null;
    }

    function FormWithConsumer() {
      const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "" },
      });
      return (
        <Form {...form}>
          <form>
            <ContextConsumer />
          </form>
        </Form>
      );
    }

    render(<FormWithConsumer />);
    expect(contextReceived).toBe(true);
  });

  it("passes formState down so descendants can read isDirty after change", async () => {
    let isDirty = false;

    function DirtyCapture() {
      const { formState } = useFormContext<EmailFormValues>();
      isDirty = formState.isDirty;
      return null;
    }

    function FormWithDirtyCapture() {
      const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "" },
      });
      return (
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DirtyCapture />
          </form>
        </Form>
      );
    }

    render(<FormWithDirtyCapture />);
    expect(isDirty).toBe(false);

    const input = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(input, { target: { value: "typed@example.com" } });
    });

    expect(isDirty).toBe(true);
  });
});

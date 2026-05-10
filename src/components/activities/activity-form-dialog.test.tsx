/**
 * Integration tests for ActivityFormDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog uses React Hook Form + Zod (shadcn <Form>). It calls
 * `createActivity` / `updateActivity` from "@/lib/api/activities"
 * via `apiRequestFromClient` (HTTP). Both are mocked at module level.
 *
 * Conditional rendering:
 * - `club_type_id` and `club_section_id` fields only render when
 *   `activity` prop is undefined/null (create mode).
 * - `link_meet` field only renders when `platform` watched value is
 *   1 (Virtual) or 2 (Híbrido). We trigger this via fireEvent.change
 *   on the underlying hidden <select> that Radix renders for a11y.
 *
 * Cross-field reset:
 * When club_type_id changes, the form calls `form.setValue("club_section_id", ...)`
 * to reset the section. We verify this by inspecting the value of the
 * hidden <select> for club_section_id after a club type change.
 *
 * Sections prop:
 * Passed as an array of { club_section_id, name, club_type_id }.
 * We provide multi-club-type test data so cross-field reset is observable.
 *
 * Select (shadcn/Radix) renders a hidden native <select> element for
 * a11y. We change Select values by firing `change` on that element.
 * For verifying current value we read that element's `.value`.
 *
 * RTL auto-cleanup:
 * Vitest uses `globals: false` — RTL auto-cleanup is skipped.
 * We explicitly import `cleanup` and call it in `afterEach`.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { Activity } from "@/lib/api/activities";

// ---------------------------------------------------------------------------
// Module-level mocks — Vitest hoists vi.mock() before imports resolve.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreateActivity = vi.fn<(...args: any[]) => Promise<unknown>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateActivity = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/activities", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/activities")>();
  return {
    ...original,
    createActivity: (clubId: number, data: unknown) =>
      mockCreateActivity(clubId, data),
    updateActivity: (activityId: number, data: unknown) =>
      mockUpdateActivity(activityId, data),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * Multi-club-type sections: 2 for Aventureros (type 1), 1 for Conquistadores (type 2).
 * This lets us verify cross-field reset when switching club_type_id.
 */
const TEST_SECTIONS = [
  { club_section_id: 10, name: "Ositos", club_type_id: 1 },
  { club_section_id: 11, name: "Castores", club_type_id: 1 },
  { club_section_id: 20, name: "Grupo Alpha", club_type_id: 2 },
];

const EXISTING_ACTIVITY: Activity = {
  activity_id: 7,
  name: "Campamento de verano",
  description: "Actividad anual",
  club_id: 1,
  club_type_id: 1,
  club_section_id: 10,
  lat: -34.6,
  long: -58.4,
  activity_time: "10:00",
  activity_place: "Parque Norte",
  image: "https://example.com/img.jpg",
  platform: 0,
  activity_type_id: 1,
  link_meet: null,
  active: true,
};

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOptions {
  open?: boolean;
  clubId?: number;
  sections?: typeof TEST_SECTIONS;
  activity?: Activity | null;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

function renderActivityDialog(opts: RenderOptions = {}) {
  const {
    open = true,
    clubId = 1,
    sections = TEST_SECTIONS,
    activity = null,
    onOpenChange = vi.fn(),
    onSuccess = vi.fn(),
  } = opts;

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ActivityFormDialog
        open={open}
        onOpenChange={onOpenChange}
        clubId={clubId}
        sections={sections}
        activity={activity}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns all hidden Radix <select> elements rendered for combobox a11y. */
function getHiddenSelects(): HTMLSelectElement[] {
  return Array.from(
    document.querySelectorAll<HTMLSelectElement>("select"),
  );
}

/** Returns the hidden <select> whose current value matches the given value string. */
function findSelectByValue(value: string): HTMLSelectElement | undefined {
  return getHiddenSelects().find((s) => s.value === value);
}

/**
 * Returns the hidden <select> that has a specific option value in its option list.
 * Useful when multiple selects share the same current value.
 */
function findSelectByOptionValue(optionValue: string): HTMLSelectElement | undefined {
  return getHiddenSelects().find((s) =>
    Array.from(s.options).some((o) => o.value === optionValue),
  );
}

/** Changes a Radix Select's value by firing change on the hidden native <select>. */
function changeSelectTo(selectEl: HTMLSelectElement, value: string) {
  fireEvent.change(selectEl, { target: { value } });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ActivityFormDialog", () => {
  beforeEach(() => {
    mockCreateActivity.mockClear();
    mockUpdateActivity.mockClear();
    mockCreateActivity.mockResolvedValue({ activity_id: 99 });
    mockUpdateActivity.mockResolvedValue({ activity_id: 7 });
  });

  afterEach(() => {
    cleanup();
  });

  // ── Rendering — create mode ───────────────────────────────────────────────

  it("renders title 'Nueva actividad' and create submit button in create mode", () => {
    renderActivityDialog();

    expect(
      screen.getByRole("heading", { name: /nueva actividad/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /crear actividad/i }),
    ).toBeInTheDocument();
  });

  it("renders name, description, place, image URL, time and coordinate fields", () => {
    renderActivityDialog();

    expect(
      screen.getByPlaceholderText(messages.activities.placeholders.name),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(messages.activities.placeholders.description),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(messages.activities.placeholders.location),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        messages.activities.placeholders.externalUrl,
      ),
    ).toBeInTheDocument();

    // Both lat and long share the "0.000000" placeholder — use getAllByPlaceholderText
    const coordInputs = screen.getAllByPlaceholderText(
      messages.activities.placeholders.latitude,
    );
    expect(coordInputs.length).toBeGreaterThanOrEqual(1);
  });

  // ── Conditional: club_type_id and club_section_id only in create mode ─────

  it("renders club_type_id and club_section_id selects in create mode", () => {
    renderActivityDialog({ activity: null });

    expect(
      screen.getByText(/tipo de club/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/sección del club/i),
    ).toBeInTheDocument();
  });

  it("does NOT render club_type_id and club_section_id selects in edit mode", () => {
    renderActivityDialog({ activity: EXISTING_ACTIVITY });

    expect(
      screen.queryByText(/tipo de club/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/sección del club/i),
    ).not.toBeInTheDocument();
  });

  // ── Rendering — edit mode ─────────────────────────────────────────────────

  it("renders 'Editar actividad' title and 'Guardar cambios' button in edit mode", () => {
    renderActivityDialog({ activity: EXISTING_ACTIVITY });

    expect(
      screen.getByRole("heading", { name: /editar actividad/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /guardar cambios/i }),
    ).toBeInTheDocument();
  });

  it("pre-fills name, place, and image fields with existing activity data", () => {
    renderActivityDialog({ activity: EXISTING_ACTIVITY });

    const nameInput = screen.getByPlaceholderText(
      messages.activities.placeholders.name,
    ) as HTMLInputElement;
    expect(nameInput.value).toBe("Campamento de verano");

    const placeInput = screen.getByPlaceholderText(
      messages.activities.placeholders.location,
    ) as HTMLInputElement;
    expect(placeInput.value).toBe("Parque Norte");

    const imageInput = screen.getByPlaceholderText(
      messages.activities.placeholders.externalUrl,
    ) as HTMLInputElement;
    expect(imageInput.value).toBe("https://example.com/img.jpg");
  });

  // ── Conditional: link_meet field appears only when platform is virtual/hybrid ─

  it("does NOT render link_meet field when platform is Presencial (0)", () => {
    renderActivityDialog();

    // Default platform is 0 (Presencial)
    expect(
      screen.queryByPlaceholderText(
        messages.activities.placeholders.meetUrl,
      ),
    ).not.toBeInTheDocument();
  });

  it("renders link_meet field when platform is changed to Virtual (1)", async () => {
    renderActivityDialog();

    // The platform select tracks value "0" initially. Find it and change to "1".
    const platformSelect = findSelectByValue("0");
    expect(platformSelect).toBeDefined();

    await act(async () => {
      changeSelectTo(platformSelect!, "1");
    });

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          messages.activities.placeholders.meetUrl,
        ),
      ).toBeInTheDocument();
    });
  });

  it("renders link_meet field when platform is changed to Híbrido (2)", async () => {
    renderActivityDialog();

    const platformSelect = findSelectByValue("0");
    expect(platformSelect).toBeDefined();

    await act(async () => {
      changeSelectTo(platformSelect!, "2");
    });

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          messages.activities.placeholders.meetUrl,
        ),
      ).toBeInTheDocument();
    });
  });

  it("hides link_meet field again when platform is switched back to Presencial (0)", async () => {
    renderActivityDialog();

    const platformSelect = findSelectByValue("0");

    // Switch to Virtual
    await act(async () => {
      changeSelectTo(platformSelect!, "1");
    });
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(messages.activities.placeholders.meetUrl),
      ).toBeInTheDocument();
    });

    // Switch back to Presencial
    await act(async () => {
      changeSelectTo(platformSelect!, "0");
    });
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText(
          messages.activities.placeholders.meetUrl,
        ),
      ).not.toBeInTheDocument();
    });
  });

  // ── Cross-field reset: club_type_id change resets club_section_id ─────────

  it("resets club_section_id to the first matching section when club_type_id changes", async () => {
    renderActivityDialog({ sections: TEST_SECTIONS });

    // In create mode, Radix hidden <select> elements appear in DOM order matching
    // JSX render order: [0] activity_type_id, [1] club_type_id, [2] club_section_id, [3] platform
    // We select by index 1 for club_type_id and confirm by verifying options "1","2","3".
    const selects = getHiddenSelects();
    const clubTypeSelect = selects[1]; // club_type_id is the second select
    expect(clubTypeSelect).toBeDefined();
    expect(Array.from(clubTypeSelect!.options).map((o) => o.value)).toEqual([
      "1",
      "2",
      "3",
    ]);

    // Switch to Conquistadores (type 2) → section should reset to 20 (first type-2 section)
    await act(async () => {
      changeSelectTo(clubTypeSelect!, "2");
    });

    await waitFor(() => {
      // club_section_id select is index 2 — its value should now be "20"
      const sectionSelect = getHiddenSelects()[2];
      expect(sectionSelect).toBeDefined();
      expect(sectionSelect!.value).toBe("20");
    });
  });

  it("resets club_section_id to 0 when club_type_id changes to a type with no matching sections", async () => {
    renderActivityDialog({ sections: TEST_SECTIONS });

    // club_type_id is hidden select at index 1 in create mode
    const selects = getHiddenSelects();
    const clubTypeSelect = selects[1];
    expect(clubTypeSelect).toBeDefined();

    // Switch to Guías Mayores (type 3) — TEST_SECTIONS has no entries for type 3
    await act(async () => {
      changeSelectTo(clubTypeSelect!, "3");
    });

    await waitFor(() => {
      // club_section_id select (index 2) should fall back to value "0"
      const sectionSelect = getHiddenSelects()[2];
      expect(sectionSelect).toBeDefined();
      expect(sectionSelect!.value).toBe("0");
    });
  });

  // ── Validation on empty submit ─────────────────────────────────────────────

  it("shows required validation errors for name, place, and image on empty submit", async () => {
    renderActivityDialog();

    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(
        screen.getByText(messages.activities.validation.name_required),
      ).toBeInTheDocument();
      expect(
        screen.getByText(messages.activities.validation.activity_place_required),
      ).toBeInTheDocument();
      expect(
        screen.getByText(messages.activities.validation.image_required),
      ).toBeInTheDocument();
    });
  });

  it("marks required text inputs as aria-invalid after empty submit", async () => {
    renderActivityDialog();

    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText(
        messages.activities.placeholders.name,
      );
      expect(nameInput).toHaveAttribute("aria-invalid", "true");
    });
  });

  // ── Cancel without submitting ─────────────────────────────────────────────

  it("calls onOpenChange(false) and does not call API when cancel is clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderActivityDialog();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockCreateActivity).not.toHaveBeenCalled();
    expect(mockUpdateActivity).not.toHaveBeenCalled();
  });

  // ── Submit during pending ─────────────────────────────────────────────────

  it("disables submit button while creation is in progress", async () => {
    let resolveCreate!: () => void;
    mockCreateActivity.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveCreate = () => res({ activity_id: 99 });
      }),
    );

    renderActivityDialog();

    // Fill required fields
    fireEvent.change(
      screen.getByPlaceholderText(messages.activities.placeholders.name),
      { target: { value: "Actividad test" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(messages.activities.placeholders.location),
      { target: { value: "Sede Central" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(messages.activities.placeholders.externalUrl),
      { target: { value: "https://example.com/img.jpg" } },
    );

    const submitBtn = screen.getByRole("button", { name: /crear actividad/i });

    const form = document.querySelector("form")!;
    act(() => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    await act(async () => {
      resolveCreate();
    });
  });

  // ── Valid submit (create mode) ─────────────────────────────────────────────

  it("calls createActivity with clubId and full payload on valid create submit", async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    renderActivityDialog({ onSuccess, onOpenChange, clubId: 5 });

    // Fill required fields
    fireEvent.change(
      screen.getByPlaceholderText(messages.activities.placeholders.name),
      { target: { value: "Gran Aventura" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(messages.activities.placeholders.location),
      { target: { value: "Parque Central" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(messages.activities.placeholders.externalUrl),
      { target: { value: "https://example.com/img.jpg" } },
    );

    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockCreateActivity).toHaveBeenCalledOnce();
    });

    const [clubIdArg, payload] = (mockCreateActivity.mock.calls[0] as unknown) as [
      number,
      {
        name: string;
        activity_place: string;
        image: string;
        club_type_id: number;
        club_section_id: number;
      },
    ];
    expect(clubIdArg).toBe(5);
    expect(payload.name).toBe("Gran Aventura");
    expect(payload.activity_place).toBe("Parque Central");
    expect(payload.image).toBe("https://example.com/img.jpg");
    // create mode must include club_type_id and club_section_id
    expect(payload.club_type_id).toBeDefined();
    expect(payload.club_section_id).toBeDefined();

    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── Valid submit (edit mode) ───────────────────────────────────────────────

  it("calls updateActivity with activity_id and payload WITHOUT club_type_id/club_section_id in edit mode", async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    renderActivityDialog({
      activity: EXISTING_ACTIVITY,
      onSuccess,
      onOpenChange,
    });

    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockUpdateActivity).toHaveBeenCalledOnce();
    });

    const [activityIdArg, payload] = (mockUpdateActivity.mock.calls[0] as unknown) as [
      number,
      Record<string, unknown>,
    ];
    expect(activityIdArg).toBe(7);
    expect(payload.name).toBe("Campamento de verano");
    // edit payload must NOT include club_type_id or club_section_id
    expect(payload).not.toHaveProperty("club_type_id");
    expect(payload).not.toHaveProperty("club_section_id");

    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

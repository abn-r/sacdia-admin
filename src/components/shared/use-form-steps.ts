"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Controls in a step that fail native constraints (required, min/max, guards). */
function invalidControls(container: HTMLElement | null): Control[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<Control>("input, select, textarea")).filter(
    (element) => !element.disabled && element.type !== "hidden" && !element.validity.valid,
  );
}

function focusFirst(controls: Control[]) {
  const target = controls.find((element) => element.getAttribute("aria-hidden") !== "true");
  if (!target) return;
  // The step may still be `hidden` until the next paint.
  window.requestAnimationFrame(() => target.focus());
}

const FOCUSABLE = "button, input:not([type=hidden]), select, textarea, [tabindex]";

function findField(container: HTMLElement | null, name: string): HTMLElement | null {
  if (!container) return null;
  return (
    container.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`) ??
    container.querySelector<HTMLElement>(`[id="${CSS.escape(name)}"]`)
  );
}

/** Hidden/aria-hidden mirrors (Radix select, hidden inputs) defer to a visible sibling control. */
function focusableFor(element: HTMLElement): HTMLElement | null {
  const isMirror =
    element.getAttribute("aria-hidden") === "true" ||
    (element instanceof HTMLInputElement && element.type === "hidden");
  if (!isMirror) return element;
  const candidates = Array.from(element.parentElement?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
  return candidates.find((el) => el.getAttribute("aria-hidden") !== "true") ?? null;
}

/**
 * Step state for FormData forms whose steps all stay mounted (`hidden`) so the
 * server action receives every field. The form must be `noValidate`: each step
 * is checked against native constraints on "Continue", and the final submit
 * jumps to the first step that is still invalid.
 */
export function useFormSteps(total: number) {
  const lastStep = total - 1;
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [stepIncomplete, setStepIncomplete] = useState(false);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  function goTo(next: number) {
    setStepIncomplete(false);
    setDirection(next < step ? "back" : "forward");
    setStep(next);
  }

  /** Jumps to the step that holds the field (by `name`, then `id`) and focuses it. */
  function goToField(name: string): boolean {
    for (let index = 0; index < total; index += 1) {
      const element = findField(stepRefs.current[index] ?? null, name);
      if (!element) continue;
      if (index !== step) goTo(index);
      const target = focusableFor(element);
      if (target) window.requestAnimationFrame(() => target.focus());
      return true;
    }
    return false;
  }

  function goNext() {
    const invalid = invalidControls(stepRefs.current[step] ?? null);
    if (invalid.length > 0) {
      setStepIncomplete(true);
      focusFirst(invalid);
      return;
    }
    goTo(Math.min(step + 1, lastStep));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Submits from portaled dialogs (e.g. venue create) bubble here through React.
    if (event.target !== event.currentTarget) return;
    if (step < lastStep) {
      event.preventDefault();
      goNext();
      return;
    }
    for (let index = 0; index < total; index += 1) {
      const invalid = invalidControls(stepRefs.current[index] ?? null);
      if (invalid.length > 0) {
        event.preventDefault();
        if (index !== step) goTo(index);
        setStepIncomplete(true);
        focusFirst(invalid);
        return;
      }
    }
  }

  // Enter in a single-line field advances instead of submitting a half-filled form.
  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter" || step >= lastStep) return;
    const target = event.target as HTMLElement;
    if (!event.currentTarget.contains(target)) return;
    if (target instanceof HTMLInputElement && target.type !== "button" && target.type !== "submit") {
      event.preventDefault();
      goNext();
    }
  }

  const stepRef = (index: number) => (element: HTMLDivElement | null) => {
    stepRefs.current[index] = element;
  };

  return {
    step,
    direction,
    lastStep,
    stepIncomplete,
    goTo,
    goNext,
    goToField,
    handleSubmit,
    handleKeyDown,
    stepRef,
  };
}

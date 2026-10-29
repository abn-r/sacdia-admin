"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";

/** Text values of a submitted form, keyed by input name. */
export type SubmittedValues = Record<string, string>;

type Retained<S> = S & { submitted?: SubmittedValues };

/** String entries of a FormData (files are skipped); the last value of a repeated name wins. */
export function formDataToValues(formData: FormData): SubmittedValues {
  const values: SubmittedValues = {};
  for (const [name, value] of formData.entries()) {
    if (typeof value === "string") values[name] = value;
  }
  return values;
}

/**
 * Value to show in an uncontrolled field: what the user submitted when the
 * server rejected the form, otherwise the record's own value.
 */
export function retainedValue(
  values: SubmittedValues | undefined,
  name: string,
  fallback: string,
): string {
  return values?.[name] ?? fallback;
}

/**
 * `useActionState` for server-action forms that must not lose what the user
 * typed when the server answers with an error.
 *
 * React 19 resets the uncontrolled fields of a `<form action>` once the action
 * settles, even when it failed. On an error result the submitted values are
 * kept in the state; feed them back through `retainedValue` as `defaultValue`
 * so the reset lands on what the user typed instead of on the record's value.
 *
 * Call `discard()` when the form is (re)opened so a previous failed attempt
 * does not leak into a fresh form.
 */
export function useRetainedActionState<S extends { error?: string }>(
  action: (prev: S, formData: FormData) => Promise<S>,
  initialState: S,
) {
  const [state, formAction, pending] = useActionState<Retained<S>, FormData>(
    async (prev, formData) => {
      const next = await action(prev, formData);
      return next.error ? { ...next, submitted: formDataToValues(formData) } : next;
    },
    initialState as Awaited<Retained<S>>,
  );

  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  const [discarded, setDiscarded] = useState<Retained<S> | null>(null);
  const discard = useCallback(() => setDiscarded(latest.current), []);

  const values = state === discarded ? undefined : state.submitted;

  return { state, formAction, pending, values, discard };
}

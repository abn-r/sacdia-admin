"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type FormSubmitButtonProps = Omit<ComponentProps<typeof Button>, "type" | "loading">;

/**
 * Submit button that reflects the enclosing form's pending state.
 *
 * Do NOT track pending with local state set in `onClick`: that disables the
 * button before the browser submits the form, so the server action never runs.
 * `useFormStatus` only flips to pending once the submission has started.
 */
export function FormSubmitButton(props: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  return <Button {...props} type="submit" loading={pending} />;
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HonorFormFields } from "@/components/honors/honor-form-fields";
import type { SelectOption } from "@/lib/honors/catalogs";
import type { HonorActionState } from "@/lib/honors/actions";

type HonorRecord = Record<string, unknown>;
type HonorFormAction = (
  prevState: HonorActionState,
  formData: FormData,
) => Promise<HonorActionState>;

interface HonorFormProps {
  mode: "create" | "edit";
  initialItem?: HonorRecord | null;
  categoryOptions: SelectOption[];
  clubTypeOptions: SelectOption[];
  formAction: HonorFormAction;
}

const initialState: HonorActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
      {label}
    </Button>
  );
}

export function HonorForm({
  mode,
  initialItem,
  categoryOptions,
  clubTypeOptions,
  formAction,
}: HonorFormProps) {
  const [state, action] = useActionState(formAction, initialState);
  const submitLabel = mode === "create" ? "Crear especialidad" : "Guardar cambios";

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <HonorFormFields
        item={initialItem}
        categoryOptions={categoryOptions}
        clubTypeOptions={clubTypeOptions}
      />

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard/honors">Cancelar</Link>
        </Button>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

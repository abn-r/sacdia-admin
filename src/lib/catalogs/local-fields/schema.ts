import { z } from "zod";

export const localFieldFormSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio.").max(50),
    abbreviation: z.string().trim().min(1, "La abreviatura es obligatoria.").max(8),
    union_id: z.number().int().positive("Selecciona una unión."),
    active: z.boolean(),
    // The API requires a zone for an active local field (investiture windows
    // and other dates run in it) and only lets an inactive one go without.
    timezone: z.string().trim().max(64).nullable(),
  })
  .refine((values) => !values.active || Boolean(values.timezone), {
    message: "Selecciona la zona horaria del campo local.",
    path: ["timezone"],
  });

export type LocalFieldFormValues = z.infer<typeof localFieldFormSchema>;

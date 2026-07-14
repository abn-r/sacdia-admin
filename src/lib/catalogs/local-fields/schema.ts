import { z } from "zod";

export const localFieldFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(50),
  abbreviation: z.string().trim().min(1, "La abreviatura es obligatoria.").max(8),
  union_id: z.number().int().positive("Selecciona una unión."),
  active: z.boolean(),
});

export type LocalFieldFormValues = z.infer<typeof localFieldFormSchema>;

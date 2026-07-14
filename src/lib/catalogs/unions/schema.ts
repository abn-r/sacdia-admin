import { z } from "zod";

export const unionFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(50),
  abbreviation: z.string().trim().min(1, "La abreviatura es obligatoria.").max(8),
  country_id: z.number().int().positive("Selecciona un país."),
  division_id: z.number().int().positive("Selecciona una división."),
  active: z.boolean(),
});

export type UnionFormValues = z.infer<typeof unionFormSchema>;

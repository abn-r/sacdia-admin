import { z } from "zod";

export const countryFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(50),
  abbreviation: z.string().trim().min(1, "La abreviatura es obligatoria.").max(8),
  active: z.boolean(),
});

export type CountryFormValues = z.infer<typeof countryFormSchema>;

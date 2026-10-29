import { z } from "zod";

export const countryFormSchema = z.object({
  name: z.string().trim().min(1, "required:name").max(50),
  abbreviation: z.string().trim().min(1, "required:abbreviation").max(8),
  active: z.boolean(),
});

export type CountryFormValues = z.infer<typeof countryFormSchema>;

import { z } from "zod";

export const unionFormSchema = z.object({
  name: z.string().trim().min(1, "required:name").max(50),
  abbreviation: z.string().trim().min(1, "required:abbreviation").max(8),
  country_id: z.number({ error: "select:country" }).int().positive("select:country"),
  division_id: z.number({ error: "select:division" }).int().positive("select:division"),
  active: z.boolean(),
});

export type UnionFormValues = z.infer<typeof unionFormSchema>;

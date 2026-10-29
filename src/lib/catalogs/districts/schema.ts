import { z } from "zod";

export const districtFormSchema = z.object({
  name: z.string().trim().min(1, "required:name").max(50),
  local_field_id: z.number({ error: "select:local_field" }).int().positive("select:local_field"),
  active: z.boolean(),
});

export type DistrictFormValues = z.infer<typeof districtFormSchema>;

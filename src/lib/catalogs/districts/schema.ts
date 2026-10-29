import { z } from "zod";

export const districtFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(50),
  local_field_id: z.number({ error: "Selecciona un campo local." }).int().positive("Selecciona un campo local."),
  active: z.boolean(),
});

export type DistrictFormValues = z.infer<typeof districtFormSchema>;

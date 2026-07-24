import { z } from "zod";

export const clubTypeFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(50),
  active: z.boolean(),
});

export type ClubTypeFormValues = z.infer<typeof clubTypeFormSchema>;

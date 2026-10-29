import { z } from "zod";

export const clubIdealFormSchema = z.object({
  name: z.string().trim().min(1, "required:name").max(50),
  ideal: z.string().trim().max(5000).optional(),
  ideal_order: z.coerce.number().int().min(1, "min:ideal_order:1"),
  club_type_id: z.coerce.number().int().positive("select:club_type"),
  active: z.boolean(),
});

export type ClubIdealFormValues = z.infer<typeof clubIdealFormSchema>;

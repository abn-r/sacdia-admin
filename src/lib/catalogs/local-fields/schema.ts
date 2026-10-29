import { z } from "zod";

export const localFieldFormSchema = z
  .object({
    name: z.string().trim().min(1, "required:name").max(50),
    abbreviation: z.string().trim().min(1, "required:abbreviation").max(8),
    union_id: z.number({ error: "select:union" }).int().positive("select:union"),
    active: z.boolean(),
    // The API requires a zone for an active local field (investiture windows
    // and other dates run in it) and only lets an inactive one go without.
    timezone: z.string().trim().max(64).nullable(),
  })
  .refine((values) => !values.active || Boolean(values.timezone), {
    message: "select:timezone",
    path: ["timezone"],
  });

export type LocalFieldFormValues = z.infer<typeof localFieldFormSchema>;

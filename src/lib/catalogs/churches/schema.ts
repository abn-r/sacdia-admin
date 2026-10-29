import { z } from "zod";

export const churchTranslationSchema = z.object({
  locale: z.enum(["pt-BR", "en", "fr"]),
  name: z.string().trim().optional(),
});

export const churchFormSchema = z.object({
  name: z.string().trim().min(1, "required:name").max(50),
  district_id: z.number({ error: "select:district" }).int().positive("select:district"),
  active: z.boolean(),
  translations: z.array(churchTranslationSchema).default([]),
});

export type ChurchFormValues = z.infer<typeof churchFormSchema>;

import { z } from "zod";

export const churchTranslationSchema = z.object({
  locale: z.enum(["pt-BR", "en", "fr"]),
  name: z.string().trim().optional(),
});

export const churchFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(50),
  district_id: z.number().int().positive("El distrito es obligatorio."),
  active: z.boolean(),
  translations: z.array(churchTranslationSchema).default([]),
});

export type ChurchFormValues = z.infer<typeof churchFormSchema>;

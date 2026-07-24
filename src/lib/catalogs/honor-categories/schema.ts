import { z } from "zod";

export const honorCategoryTranslationSchema = z.object({
  locale: z.enum(["pt-BR", "en", "fr"]),
  name: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export const honorCategoryFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(100),
  description: z.string().trim().optional(),
  active: z.boolean(),
  translations: z.array(honorCategoryTranslationSchema).default([]),
});

export type HonorCategoryFormValues = z.infer<typeof honorCategoryFormSchema>;

import { z } from "zod";

export const divisionTranslationSchema = z.object({
  locale: z.enum(["pt-BR", "en", "fr"]),
  name: z.string().trim().optional(),
});

export const divisionFormSchema = z.object({
  code: z.string().trim().min(1, "required:code").max(50),
  name: z.string().trim().min(1, "required:name").max(100),
  abbreviation: z.string().trim().min(1, "required:abbreviation").max(16),
  active: z.boolean(),
  translations: z.array(divisionTranslationSchema).default([]),
});

export type DivisionFormValues = z.infer<typeof divisionFormSchema>;

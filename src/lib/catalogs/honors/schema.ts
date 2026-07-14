import { z } from "zod";

export const honorTranslationSchema = z.object({
  locale: z.enum(["pt-BR", "en", "fr"]),
  name: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export const honorFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(100),
  description: z.string().trim().optional(),
  honor_image: z.string().trim().min(1, "La imagen es obligatoria."),
  material_url: z.string().trim().min(1, "La URL del material es obligatoria."),
  honors_category_id: z.number().int().positive("La categoría es obligatoria."),
  club_type_id: z.number().int().positive("El tipo de club es obligatorio."),
  active: z.boolean(),
  approval: z.number().int().min(1).max(3).optional(),
  skill_level: z.number().int().min(1).max(3).optional(),
  master_honors_id: z.number().int().positive().nullable().optional(),
  year: z.string().trim().optional(),
  translations: z.array(honorTranslationSchema).default([]),
});

export type HonorFormValues = z.infer<typeof honorFormSchema>;

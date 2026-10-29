import { z } from "zod";

export const honorTranslationSchema = z.object({
  locale: z.enum(["pt-BR", "en", "fr"]),
  name: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export const honorFormSchema = z.object({
  name: z.string().trim().min(1, "required:name").max(100),
  description: z.string().trim().optional(),
  honor_image: z.string().trim().min(1, "required:honor_image"),
  material_url: z.string().trim().min(1, "required:material_url"),
  honors_category_id: z.number({ error: "select:honor_category" }).int().positive("select:honor_category"),
  club_type_id: z.number({ error: "select:club_type" }).int().positive("select:club_type"),
  active: z.boolean(),
  approval: z.number().int().min(1).max(3).optional(),
  skill_level: z.number().int().min(1).max(3).optional(),
  master_honors_id: z.number().int().positive().nullable().optional(),
  year: z.string().trim().optional(),
  translations: z.array(honorTranslationSchema).default([]),
});

export type HonorFormValues = z.infer<typeof honorFormSchema>;

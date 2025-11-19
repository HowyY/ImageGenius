import { z } from "zod";

export const stylePresetSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  engines: z.array(z.string()),
});

export const generateRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  styleId: z.string().min(1, "Style is required"),
  engine: z.enum(["nanobanana", "seeddream"], {
    errorMap: () => ({ message: "Engine must be either 'nanobanana' or 'seeddream'" }),
  }),
});

export const generateResponseSchema = z.object({
  imageUrl: z.string().url(),
});

export type StylePreset = z.infer<typeof stylePresetSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type GenerateResponse = z.infer<typeof generateResponseSchema>;

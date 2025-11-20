import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const generationHistory = pgTable("generation_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  prompt: text("prompt").notNull(),
  styleId: text("style_id").notNull(),
  styleLabel: text("style_label").notNull(),
  engine: text("engine").notNull(),
  finalPrompt: text("final_prompt").notNull(),
  referenceImageUrl: text("reference_image_url").notNull(),
  generatedImageUrl: text("generated_image_url").notNull(),
  characterReferenceUrl: text("character_reference_url"),
  userReferenceUrls: text("user_reference_urls").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const baseInsertSchema = createInsertSchema(generationHistory);

export const insertGenerationHistorySchema = z.object({
  prompt: z.string().min(1),
  styleId: z.string().min(1),
  styleLabel: z.string().min(1),
  engine: z.string().min(1),
  finalPrompt: z.string().min(1),
  referenceImageUrl: z.string().url(),
  generatedImageUrl: z.string().url(),
  characterReferenceUrl: z.string().url().optional(),
  userReferenceUrls: z.array(z.string().url()).max(3).optional(),
});

export type InsertGenerationHistory = z.infer<typeof insertGenerationHistorySchema>;
export type SelectGenerationHistory = typeof generationHistory.$inferSelect;

export const stylePresetSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  engines: z.array(z.string()),
});

export const generateRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  styleId: z.string().min(1, "Style is required"),
  engine: z.enum(["nanobanana", "seedream"], {
    errorMap: () => ({ message: "Engine must be either 'nanobanana' or 'seedream'" }),
  }),
  characterReference: z.string().url().optional(),
  userReferenceImages: z.array(z.string().url()).max(3).optional(),
});

export const generateResponseSchema = z.object({
  imageUrl: z.string().url(),
  historyId: z.number().optional(),
});

export type StylePreset = z.infer<typeof stylePresetSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type GenerateResponse = z.infer<typeof generateResponseSchema>;

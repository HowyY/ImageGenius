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
  userReferenceUrls: text("user_reference_urls").array(),
  allReferenceImageUrls: text("all_reference_image_urls").array(),
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
  userReferenceUrls: z.array(z.string().url()).max(3).optional(),
  allReferenceImageUrls: z.array(z.string().url()).optional(),
});

export type InsertGenerationHistory = z.infer<typeof insertGenerationHistorySchema>;
export type SelectGenerationHistory = typeof generationHistory.$inferSelect;

const colorSchema = z.object({
  name: z.string(),
  hex: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  role: z.string().optional(),
});

const colorPaletteSchema = z.object({
  name: z.string().optional(),
  colors: z.array(colorSchema).min(1).max(10),
});

export const stylePresetSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  engines: z.array(z.string()),
  defaultColors: colorPaletteSchema.optional(),
});

export const promptTemplateSchema = z.object({
  name: z.string(),
  colorMode: z.enum(["default", "custom"]).optional().default("default"),
  customColors: colorPaletteSchema.optional(),
  cameraComposition: z.object({
    enabled: z.boolean(),
    cameraAngle: z.string(),
    compositionLayout: z.string(),
    framing: z.string(),
    depthArrangement: z.string(),
  }),
  environment: z.object({
    enabled: z.boolean(),
    setting: z.string(),
    lighting: z.string(),
    atmosphere: z.string(),
    backgroundComplexity: z.string(),
  }),
  mainCharacter: z.object({
    enabled: z.boolean(),
    pose: z.string(),
    expression: z.string(),
    interaction: z.string(),
    clothing: z.string(),
  }),
  secondaryObjects: z.object({
    enabled: z.boolean(),
    objects: z.string(),
    motionCues: z.string(),
    scaleRules: z.string(),
  }),
  styleEnforcement: z.object({
    enabled: z.boolean(),
    styleRules: z.string(),
    colorPalette: z.string(),
    textureDensity: z.string(),
  }),
  negativePrompt: z.object({
    enabled: z.boolean(),
    items: z.string(),
  }),
});

export const generateRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  styleId: z.string().min(1, "Style is required"),
  engine: z.enum(["nanobanana", "seedream"], {
    errorMap: () => ({ message: "Engine must be either 'nanobanana' or 'seedream'" }),
  }),
  userReferenceImages: z.array(z.string().url()).max(3).optional(),
  customTemplate: promptTemplateSchema.optional(),
  templateReferenceImages: z.array(z.string()).optional(),
});

export const generateResponseSchema = z.object({
  imageUrl: z.string().url(),
  historyId: z.number().optional(),
});

export type Color = z.infer<typeof colorSchema>;
export type ColorPalette = z.infer<typeof colorPaletteSchema>;
export type PromptTemplate = z.infer<typeof promptTemplateSchema>;
export type StylePreset = z.infer<typeof stylePresetSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type GenerateResponse = z.infer<typeof generateResponseSchema>;
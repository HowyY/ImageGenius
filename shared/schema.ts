import { pgTable, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Styles table for custom and built-in style presets
export const styles = pgTable("styles", {
  id: text("id").primaryKey(), // e.g., "cyan_sketchline_vector"
  label: text("label").notNull(),
  description: text("description").notNull(),
  engines: text("engines").array().notNull(),
  basePrompt: text("base_prompt").notNull(),
  defaultColors: jsonb("default_colors"), // ColorPalette object
  referenceImageUrl: text("reference_image_url").notNull(),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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

export const promptTemplates = pgTable("prompt_templates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  styleId: text("style_id").notNull().unique(),
  templateData: jsonb("template_data").notNull(),
  referenceImages: text("reference_images").array().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Storyboard scenes table for script-driven image generation
export const storyboardScenes = pgTable("storyboard_scenes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderIndex: integer("order_index").notNull().default(0),
  voiceOver: text("voice_over").notNull().default(""),
  visualDescription: text("visual_description").notNull().default(""),
  generatedImageUrl: text("generated_image_url"),
  styleId: text("style_id"),
  engine: text("engine"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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

export const insertPromptTemplateSchema = z.object({
  styleId: z.string().min(1),
  templateData: z.any(),
  referenceImages: z.array(z.string()).optional(),
});

export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;
export type SelectPromptTemplate = typeof promptTemplates.$inferSelect;

// Insert schema for styles
export const insertStyleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  engines: z.array(z.string()),
  basePrompt: z.string().min(1),
  defaultColors: z.any().optional(),
  referenceImageUrl: z.string().url(),
  isBuiltIn: z.boolean().optional().default(false),
});

export type InsertStyle = z.infer<typeof insertStyleSchema>;
export type SelectStyle = typeof styles.$inferSelect;

// Insert schema for storyboard scenes
export const insertStoryboardSceneSchema = z.object({
  orderIndex: z.number().int().min(0).optional(),
  voiceOver: z.string().default(""),
  visualDescription: z.string().default(""),
  generatedImageUrl: z.string().url().optional().nullable(),
  styleId: z.string().optional().nullable(),
  engine: z.string().optional().nullable(),
});

export const updateStoryboardSceneSchema = z.object({
  orderIndex: z.number().int().min(0).optional(),
  voiceOver: z.string().optional(),
  visualDescription: z.string().optional(),
  generatedImageUrl: z.string().optional().nullable(),
  styleId: z.string().optional().nullable(),
  engine: z.string().optional().nullable(),
});

export type InsertStoryboardScene = z.infer<typeof insertStoryboardSceneSchema>;
export type UpdateStoryboardScene = z.infer<typeof updateStoryboardSceneSchema>;
export type SelectStoryboardScene = typeof storyboardScenes.$inferSelect;

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
  basePrompt: z.string().optional(),
  defaultColors: colorPaletteSchema.optional(),
});

// Simple template schema for concatenation-style prompts
export const simpleTemplateSchema = z.object({
  name: z.string(),
  templateType: z.literal("simple"),
  suffix: z.string().optional().default("white background, 8k resolution"),
});

// V2 Universal template schema - simplified admin-only configuration
// Following the new architecture: Admin edits style, User edits scene
// Supports two palette modes:
// - strict: Uses HEX array (strictPalette) - for brand color requirements
// - loose: Uses color description (loosePalette) - recommended for better gradient behavior
export const universalTemplateSchema = z.object({
  name: z.string(),
  templateType: z.literal("universal"),
  styleKeywords: z.string(), // Descriptive words for the style
  paletteMode: z.enum(["strict", "loose"]).optional().default("loose"), // Color mode
  strictPalette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).optional(), // HEX colors for strict mode
  loosePalette: z.string().optional(), // Color description for loose mode (recommended)
  defaultPalette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).optional(), // Legacy: kept for backward compatibility
  rules: z.string(), // Universal drawing rules
  negativePrompt: z.string(), // Negative prompt keywords
});

export const promptTemplateSchema = z.object({
  name: z.string(),
  templateType: z.literal("structured").optional().default("structured"),
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

// Union of template types for request validation
export const anyTemplateSchema = z.union([simpleTemplateSchema, promptTemplateSchema, universalTemplateSchema]);

export const generateRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  styleId: z.string().min(1, "Style is required"),
  engine: z.enum(["nanobanana", "seedream", "nanopro"], {
    errorMap: () => ({ message: "Engine must be 'nanobanana', 'seedream', or 'nanopro'" }),
  }),
  userReferenceImages: z.array(z.string().url()).max(3).optional(),
  customTemplate: anyTemplateSchema.optional(),
  templateReferenceImages: z.array(z.string()).optional(),
});

export const generateResponseSchema = z.object({
  imageUrl: z.string().url(),
  historyId: z.number().optional(),
});

export type Color = z.infer<typeof colorSchema>;
export type ColorPalette = z.infer<typeof colorPaletteSchema>;
export type PromptTemplate = z.infer<typeof promptTemplateSchema>;
export type SimpleTemplate = z.infer<typeof simpleTemplateSchema>;
export type UniversalTemplate = z.infer<typeof universalTemplateSchema>;
export type AnyTemplate = PromptTemplate | SimpleTemplate | UniversalTemplate;
export type StylePreset = z.infer<typeof stylePresetSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type GenerateResponse = z.infer<typeof generateResponseSchema>;
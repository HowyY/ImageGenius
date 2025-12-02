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
  isHidden: boolean("is_hidden").notNull().default(false), // Hidden styles are only visible in Style Editor
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
  sceneId: integer("scene_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const promptTemplates = pgTable("prompt_templates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  styleId: text("style_id").notNull().unique(),
  templateData: jsonb("template_data").notNull(),
  referenceImages: text("reference_images").array().default([]),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Storyboards table - container for scenes
export const storyboards = pgTable("storyboards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  styleId: text("style_id"),
  engine: text("engine"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Storyboard versions table - snapshot of storyboard state for version control
export const storyboardVersions = pgTable("storyboard_versions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  storyboardId: integer("storyboard_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  scenesSnapshot: jsonb("scenes_snapshot").notNull(), // Array of scene data
  styleId: text("style_id"),
  engine: text("engine"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Storyboard scenes table for script-driven image generation
export const storyboardScenes = pgTable("storyboard_scenes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  storyboardId: integer("storyboard_id"), // null for legacy scenes, will be migrated
  orderIndex: integer("order_index").notNull().default(0),
  voiceOver: text("voice_over").notNull().default(""),
  visualDescription: text("visual_description").notNull().default(""),
  generatedImageUrl: text("generated_image_url"),
  styleId: text("style_id"),
  engine: text("engine"),
  selectedCharacterIds: text("selected_character_ids").array().default([]), // character IDs for this scene
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Character card schema - represents a generated character image for a specific style
export const characterCardSchema = z.object({
  id: z.string(), // unique card id
  styleId: z.string(), // which style this card was generated with
  imageUrl: z.string().url(), // generated character card image
  prompt: z.string(), // the prompt used to generate this card
  angle: z.string().optional(), // view angle: front, three-quarter, side, back, or "sheet" for character sheet
  pose: z.string().optional(), // pose type: standing, sitting, walking, action, portrait, or "sheet" for character sheet
  expression: z.string().optional(), // expression: neutral, happy, sad, angry, surprised, thoughtful
  isCharacterSheet: z.boolean().optional(), // true if this is a multi-angle character sheet
  createdAt: z.string(), // ISO timestamp
});

export type CharacterCard = z.infer<typeof characterCardSchema>;

// Avatar crop data for precise avatar positioning
// Stores the croppedAreaPercentages from react-easy-crop for accurate rendering
// Supports both new format (width/height) and legacy format (zoom) for backward compatibility
export const avatarCropSchema = z.object({
  x: z.number(), // crop x position as % of image width (0-100)
  y: z.number(), // crop y position as % of image height (0-100)
  width: z.number().optional(), // crop width as % of image width (new format)
  height: z.number().optional(), // crop height as % of image height (new format)
  zoom: z.number().optional(), // legacy zoom level (deprecated, for backward compatibility)
});

export type AvatarCrop = z.infer<typeof avatarCropSchema>;

// Per-style avatar profile with card ID and crop settings
export const avatarProfileSchema = z.object({
  cardId: z.string(), // which card to use as avatar for this style
  crop: avatarCropSchema.optional(), // crop/positioning data
});

export type AvatarProfile = z.infer<typeof avatarProfileSchema>;

// Map of styleId to avatar profile
export const avatarProfilesSchema = z.record(z.string(), avatarProfileSchema);

export type AvatarProfiles = z.infer<typeof avatarProfilesSchema>;

// Characters table for managing reusable characters
export const characters = pgTable("characters", {
  id: text("id").primaryKey(), // e.g., "char_1234567890"
  name: text("name").notNull(),
  visualPrompt: text("visual_prompt").notNull().default(""), // description for generating character cards
  characterCards: jsonb("character_cards").$type<CharacterCard[]>().default([]), // generated cards by style
  selectedCardId: text("selected_card_id"), // currently selected card id for style reference
  avatarCardId: text("avatar_card_id"), // LEGACY: global avatar card id (migrated to avatarProfiles)
  avatarProfiles: jsonb("avatar_profiles").$type<AvatarProfiles>().default({}), // per-style avatar profiles with crop data
  tags: text("tags").array().default([]), // optional tags for categorization
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
  sceneId: z.number().int().optional().nullable(),
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
  isHidden: z.boolean().optional().default(false),
});

// Update schema for styles (partial, for PATCH requests)
export const updateStyleSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  engines: z.array(z.string()).optional(),
  basePrompt: z.string().min(1).optional(),
  defaultColors: z.any().optional(),
  referenceImageUrl: z.string().url().optional(),
  isBuiltIn: z.boolean().optional(),
  isHidden: z.boolean().optional(),
});

export type InsertStyle = z.infer<typeof insertStyleSchema>;
export type UpdateStyle = z.infer<typeof updateStyleSchema>;
export type SelectStyle = typeof styles.$inferSelect;

// Insert schema for storyboards
export const insertStoryboardSchema = z.object({
  name: z.string().min(1, "Storyboard name is required"),
  description: z.string().default(""),
  styleId: z.string().optional().nullable(),
  engine: z.string().optional().nullable(),
});

export const updateStoryboardSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  styleId: z.string().optional().nullable(),
  engine: z.string().optional().nullable(),
});

export type InsertStoryboard = z.infer<typeof insertStoryboardSchema>;
export type UpdateStoryboard = z.infer<typeof updateStoryboardSchema>;
export type SelectStoryboard = typeof storyboards.$inferSelect;

// Insert schema for storyboard versions
export const insertStoryboardVersionSchema = z.object({
  storyboardId: z.number().int(),
  name: z.string().min(1, "Version name is required"),
  description: z.string().default(""),
});

export type InsertStoryboardVersion = z.infer<typeof insertStoryboardVersionSchema>;
export type SelectStoryboardVersion = typeof storyboardVersions.$inferSelect;

// Insert schema for storyboard scenes
export const insertStoryboardSceneSchema = z.object({
  storyboardId: z.number().int().optional().nullable(),
  orderIndex: z.number().int().min(0).optional(),
  voiceOver: z.string().default(""),
  visualDescription: z.string().default(""),
  generatedImageUrl: z.string().url().optional().nullable(),
  styleId: z.string().optional().nullable(),
  engine: z.string().optional().nullable(),
});

export const updateStoryboardSceneSchema = z.object({
  storyboardId: z.number().int().optional().nullable(),
  orderIndex: z.number().int().min(0).optional(),
  voiceOver: z.string().optional(),
  visualDescription: z.string().optional(),
  generatedImageUrl: z.string().optional().nullable(),
  styleId: z.string().optional().nullable(),
  engine: z.string().optional().nullable(),
  selectedCharacterIds: z.array(z.string()).optional(),
});

export type InsertStoryboardScene = z.infer<typeof insertStoryboardSceneSchema>;
export type UpdateStoryboardScene = z.infer<typeof updateStoryboardSceneSchema>;
export type SelectStoryboardScene = typeof storyboardScenes.$inferSelect;

// Insert schema for characters
export const insertCharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Character name is required"),
  visualPrompt: z.string().default(""),
  characterCards: z.array(characterCardSchema).optional().default([]),
  selectedCardId: z.string().optional().nullable(),
  avatarCardId: z.string().optional().nullable(), // LEGACY: global avatar card id
  avatarProfiles: avatarProfilesSchema.optional().default({}), // per-style avatar profiles with crop data
  tags: z.array(z.string()).optional().default([]),
});

export const updateCharacterSchema = z.object({
  name: z.string().min(1).optional(),
  visualPrompt: z.string().optional(),
  characterCards: z.array(characterCardSchema).optional(),
  selectedCardId: z.string().optional().nullable(),
  avatarCardId: z.string().optional().nullable(), // LEGACY: global avatar card id
  avatarProfiles: avatarProfilesSchema.optional(), // per-style avatar profiles with crop data
  tags: z.array(z.string()).optional(),
});

// Schema for adding a new character card
export const addCharacterCardSchema = z.object({
  styleId: z.string().min(1),
  imageUrl: z.string().url(),
  prompt: z.string(),
});

export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type UpdateCharacter = z.infer<typeof updateCharacterSchema>;
export type AddCharacterCard = z.infer<typeof addCharacterCardSchema>;
export type SelectCharacter = typeof characters.$inferSelect;

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
  sceneId: z.number().optional(),
  isEditMode: z.boolean().optional(),
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
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

// Projects table - top-level container (Orama hierarchy)
// Defined early so storyboards can reference it via FK
// Maps to Orama's projects table
export const projects = pgTable("projects", {
  id: text("id").primaryKey(), // uuid format
  title: text("title").notNull(),
  objective: text("objective").notNull().default(""),
  styleId: text("style_id"), // FK to styles table (replaces Orama's style text field)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Media table - unified storage for all generated/uploaded media (Orama hierarchy)
// Defined early so storyboard_scenes can reference it via FK
// Maps to Orama's media table
export const media = pgTable("media", {
  id: text("id").primaryKey(), // uuid format, e.g., "media_xxx"
  type: text("type").notNull(), // "image" | "audio" | "video"
  url: text("url").notNull(),
  status: text("status").notNull().default("ok"), // "uploading" | "generating" | "ok" | "failed"
  sourceType: text("source_type"), // "generation" | "upload" | "external"
  generationHistoryId: integer("generation_history_id"), // link to generation_history for provenance
  metadata: jsonb("metadata"), // flexible storage for dimensions, duration, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Storyboards table - container for scenes
// Note: In Orama, this maps to "videos" table with project_id FK
export const storyboards = pgTable("storyboards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  styleId: text("style_id"),
  engine: text("engine"),
  // Orama bridge fields (Phase 2) with FK to projects
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }), // FK to projects for Orama migration (nullable for backward compatibility)
  objective: text("objective").default(""), // Orama: key_messages equivalent
  currentStage: text("current_stage").default("storyboard"), // Orama workflow stage
  stageStatus: text("stage_status").default("in_progress"), // Orama stage status
  // Designer setup workflow
  setupCompleted: boolean("setup_completed").notNull().default(false), // Has designer completed initial style/character setup
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
// Note: In Orama, this maps to "scenes" table with version_id FK
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
  // Orama bridge fields (Phase 2) - media references with FK constraints
  // FK to media table with SET NULL on delete for gradual migration flexibility
  selectedImageId: text("selected_image_id").references(() => media.id, { onDelete: "set null" }),
  selectedVoiceId: text("selected_voice_id").references(() => media.id, { onDelete: "set null" }),
  selectedVideoId: text("selected_video_id").references(() => media.id, { onDelete: "set null" }),
  selectedMusicId: text("selected_music_id").references(() => media.id, { onDelete: "set null" }),
  taskId: text("task_id"), // Orama: async generation task tracking
  imagePrompt: text("image_prompt"), // Orama: separate from visualDescription
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

// Orama workflow enums (defined here for use in storyboard schemas)
// These are duplicated in the Orama section below for export
const workflowStageValues = ["outline", "script", "storyboard", "audio", "video"] as const;
const stageStatusValues = ["in_progress", "in_review", "in_amends", "approved"] as const;

// Insert schema for storyboards
export const insertStoryboardSchema = z.object({
  name: z.string().min(1, "Storyboard name is required"),
  description: z.string().default(""),
  styleId: z.string().optional().nullable(),
  engine: z.string().optional().nullable(),
  // Orama bridge fields (UUID validated for compatibility)
  projectId: z.string().uuid().optional().nullable(),
  objective: z.string().optional().default(""),
  currentStage: z.enum(workflowStageValues).optional().default("storyboard"),
  stageStatus: z.enum(stageStatusValues).optional().default("in_progress"),
});

export const updateStoryboardSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  styleId: z.string().optional().nullable(),
  engine: z.string().optional().nullable(),
  // Orama bridge fields (UUID validated for compatibility)
  projectId: z.string().uuid().optional().nullable(),
  objective: z.string().optional(),
  currentStage: z.enum(workflowStageValues).optional(),
  stageStatus: z.enum(stageStatusValues).optional(),
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
  // Orama bridge fields (UUID validated for media references)
  selectedImageId: z.string().uuid().optional().nullable(),
  selectedVoiceId: z.string().uuid().optional().nullable(),
  selectedVideoId: z.string().uuid().optional().nullable(),
  selectedMusicId: z.string().uuid().optional().nullable(),
  taskId: z.string().optional().nullable(), // taskId is not UUID - it's an external task reference
  imagePrompt: z.string().optional().nullable(),
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
  // Orama bridge fields (UUID validated for media references)
  selectedImageId: z.string().uuid().optional().nullable(),
  selectedVoiceId: z.string().uuid().optional().nullable(),
  selectedVideoId: z.string().uuid().optional().nullable(),
  selectedMusicId: z.string().uuid().optional().nullable(),
  taskId: z.string().optional().nullable(), // taskId is not UUID - it's an external task reference
  imagePrompt: z.string().optional().nullable(),
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

// Cinematic template schema - structured prompt with explicit sections
// Uses a film/storyboard approach with camera framing, visual anchors, color/render, specs, and negative
// This format is particularly effective for consistent style enforcement with weighted keywords
export const cinematicTemplateSchema = z.object({
  name: z.string(),
  templateType: z.literal("cinematic"),
  // Camera & Framing section: controls composition and camera angle
  cameraFraming: z.string(), // e.g., "(Medium shot:1.1), balanced composition, cinematic storyboard, eye-level angle"
  // Visual Anchors section: style-defining keywords with weights
  visualAnchors: z.string(), // e.g., "(Sketchline Vector V2 style:1.2), deep-blue outline characters..."
  // Color & Render section: color palette and rendering approach
  colorRender: z.string(), // e.g., "(blue-cyan color palette:1.2), deep-blue line palette..."
  // Technical Specs section: quality and rendering requirements
  technicalSpecs: z.string(), // e.g., "best quality, 2D vector art, clean lines, sharp edges..."
  // Negative prompts section: things to avoid with weights
  negativePrompt: z.string(), // e.g., "(shading:1.3), (shadows:1.3), (noise:1.3)..."
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
export const anyTemplateSchema = z.union([simpleTemplateSchema, promptTemplateSchema, universalTemplateSchema, cinematicTemplateSchema]);

export const generateRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  styleId: z.string().min(1, "Style is required"),
  engine: z.enum(["nanobanana", "seedream", "nanopro", "nanobanana-t2i", "nanopro-t2i"], {
    errorMap: () => ({ message: "Engine must be 'nanobanana', 'seedream', 'nanopro', 'nanobanana-t2i', or 'nanopro-t2i'" }),
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
export type CinematicTemplate = z.infer<typeof cinematicTemplateSchema>;
export type AnyTemplate = PromptTemplate | SimpleTemplate | UniversalTemplate | CinematicTemplate;
export type StylePreset = z.infer<typeof stylePresetSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type GenerateResponse = z.infer<typeof generateResponseSchema>;

// ============================================
// Assets System (Backgrounds, Props)
// ============================================

// Reference image schema for assets
export const assetReferenceImageSchema = z.object({
  url: z.string().url(),
  styleId: z.string().optional(), // optional style association
});

export type AssetReferenceImage = z.infer<typeof assetReferenceImageSchema>;

// Assets table for backgrounds and props (reusable visual elements)
export const assets = pgTable("assets", {
  id: text("id").primaryKey(), // e.g., "bg_1234567890" or "prop_1234567890"
  type: text("type").notNull(), // "background" | "prop"
  name: text("name").notNull(),
  visualPrompt: text("visual_prompt").notNull().default(""),
  referenceImages: jsonb("reference_images").$type<AssetReferenceImage[]>().default([]),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schema for assets
export const insertAssetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["background", "prop"]),
  name: z.string().min(1, "Asset name is required"),
  visualPrompt: z.string().default(""),
  referenceImages: z.array(assetReferenceImageSchema).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
});

export const updateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  visualPrompt: z.string().optional(),
  referenceImages: z.array(assetReferenceImageSchema).optional(),
  tags: z.array(z.string()).optional(),
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type UpdateAsset = z.infer<typeof updateAssetSchema>;
export type SelectAsset = typeof assets.$inferSelect;

// ============================================
// Node Workflows System
// ============================================

// Node data schema (flexible for different node types)
export const nodeDataSchema = z.record(z.string(), z.unknown());

// React Flow node schema
export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: nodeDataSchema,
});

// React Flow edge schema
export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  animated: z.boolean().optional(),
});

export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;

// Node workflows table for saving/loading node editor configurations
export const nodeWorkflows = pgTable("node_workflows", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  nodes: jsonb("nodes").$type<WorkflowNode[]>().default([]),
  edges: jsonb("edges").$type<WorkflowEdge[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schema for node workflows
export const insertNodeWorkflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  description: z.string().default(""),
  nodes: z.array(workflowNodeSchema).optional().default([]),
  edges: z.array(workflowEdgeSchema).optional().default([]),
});

export const updateNodeWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  nodes: z.array(workflowNodeSchema).optional(),
  edges: z.array(workflowEdgeSchema).optional(),
});

export type InsertNodeWorkflow = z.infer<typeof insertNodeWorkflowSchema>;
export type UpdateNodeWorkflow = z.infer<typeof updateNodeWorkflowSchema>;
export type SelectNodeWorkflow = typeof nodeWorkflows.$inferSelect;

// ============================================
// Orama-Aligned Schema (Phase 1: New Tables)
// ============================================
// These tables are added to support future migration to Orama's
// project → video → version → scene hierarchy while maintaining
// backward compatibility with the current storyboard structure.

// UUID validation helper for Orama-compatible IDs
const uuidSchema = z.string().uuid();

// Enums for Orama workflow stages and status (using same values as defined earlier)
export const workflowStageEnum = z.enum(workflowStageValues);
export const stageStatusEnum = z.enum(stageStatusValues);
export const mediaTypeEnum = z.enum(["image", "audio", "video"]);
export const mediaStatusEnum = z.enum(["uploading", "generating", "ok", "failed"]);
export const mediaRoleEnum = z.enum(["image", "voice", "video", "music", "character_reference", "style_reference"]);
export const videoFormatEnum = z.enum(["16:9", "1:1", "9:16"]);

export type WorkflowStage = z.infer<typeof workflowStageEnum>;
export type StageStatus = z.infer<typeof stageStatusEnum>;
export type MediaType = z.infer<typeof mediaTypeEnum>;
export type MediaStatus = z.infer<typeof mediaStatusEnum>;
export type MediaRole = z.infer<typeof mediaRoleEnum>;
export type VideoFormat = z.infer<typeof videoFormatEnum>;

// Note: projects and media tables are defined earlier in the file to enable FK references

// Scene Media join table - links scenes to media with roles
// Maps to Orama's scene_media table
// Note: FK constraints added for referential integrity with storyboard_scenes and media tables
export const sceneMedia = pgTable("scene_media", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sceneId: integer("scene_id").notNull().references(() => storyboardScenes.id, { onDelete: "cascade" }),
  mediaId: text("media_id").notNull().references(() => media.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "image" | "voice" | "video" | "music" | "character_reference"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Comments table - for scene-level feedback and collaboration
// Maps to Orama's comments table
// Note: FK constraints added for referential integrity
export const comments = pgTable("comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sceneId: integer("scene_id").notNull().references(() => storyboardScenes.id, { onDelete: "cascade" }),
  stage: text("stage").notNull().default("storyboard"), // workflow stage
  status: text("status"), // null | "to_do" | "done"
  parentId: integer("parent_id"), // FK to comments for threading (self-reference)
  authorName: text("author_name").notNull().default("Anonymous"), // simplified, no user table yet
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas for new tables (with UUID validation for Orama compatibility)
export const insertProjectSchema = z.object({
  id: uuidSchema, // UUID format required for Orama compatibility
  title: z.string().min(1, "Project title is required"),
  objective: z.string().default(""),
  styleId: z.string().optional().nullable(),
});

export const updateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  objective: z.string().optional(),
  styleId: z.string().optional().nullable(),
});

export const insertMediaSchema = z.object({
  id: uuidSchema, // UUID format required for Orama compatibility
  type: mediaTypeEnum,
  url: z.string().url(),
  status: mediaStatusEnum.optional().default("ok"),
  sourceType: z.enum(["generation", "upload", "external"]).optional(),
  generationHistoryId: z.number().int().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateMediaSchema = z.object({
  url: z.string().url().optional(),
  status: mediaStatusEnum.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const insertSceneMediaSchema = z.object({
  sceneId: z.number().int(),
  mediaId: uuidSchema, // UUID format for media reference
  role: mediaRoleEnum,
});

export const insertCommentSchema = z.object({
  sceneId: z.number().int(),
  stage: workflowStageEnum.optional().default("storyboard"),
  status: z.enum(["to_do", "done"]).optional().nullable(),
  parentId: z.number().int().optional().nullable(),
  authorName: z.string().default("Anonymous"),
  content: z.string().min(1, "Comment content is required"),
});

export const updateCommentSchema = z.object({
  status: z.enum(["to_do", "done"]).optional().nullable(),
  content: z.string().min(1).optional(),
});

// Types for new tables
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type SelectProject = typeof projects.$inferSelect;

export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type UpdateMedia = z.infer<typeof updateMediaSchema>;
export type SelectMedia = typeof media.$inferSelect;

export type InsertSceneMedia = z.infer<typeof insertSceneMediaSchema>;
export type SelectSceneMedia = typeof sceneMedia.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type UpdateComment = z.infer<typeof updateCommentSchema>;
export type SelectComment = typeof comments.$inferSelect;
import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { generateRequestSchema, generateResponseSchema, type StylePreset } from "@shared/schema";
import { storage } from "./storage";
import { uploadReferenceImages, uploadFileToKIE, type StyleImageMapping } from "./services/fileUpload";
import { DEFAULT_TEMPLATES, getDefaultTemplate, getAllDefaultTemplateIds } from "./default-templates";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { readdirSync, existsSync, statSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define style presets with detailed visual descriptions
// Each style has its own unique reference image for thumbnails
const DEFAULT_REFERENCE_IMAGE = "https://file.aiquickdraw.com/custom-page/akr/section-images/1756223420389w8xa2jfe.png";

// Local reference image URLs (served from client/public/)
const STYLE_REFERENCE_IMAGES = {
  cyan_sketchline_vector: "/reference-images/cyan_sketchline_vector/1.png",
  warm_orange_flat: "/reference-images/t/A.png", // Fallback until specific images added
  simple_cyan_test: "/reference-images/cyan_sketchline_vector/2.png",
  cyan_sketchline_vector_v2: "/reference-images/cyan_sketchline_vector/3.png",
} as const;

let uploadedReferenceImages: StyleImageMapping[] = [];

const STYLE_PRESETS: Array<
  StylePreset & { basePrompt: string; referenceImageUrl: string }
> = [
  {
    id: "cyan_sketchline_vector",
    label: "Cyan Sketchline Vector",
    description:
      "Hand-drawn navy outlines on bright white space with subtle cyan-to-blue gradients, financial illustration vibe, clean modern linework",
    engines: ["nanobanana", "seedream", "nanopro"],
    basePrompt:
      "clean sketch-style vector line art, white negative space, minimalist details, modern financial illustration tone",
    defaultColors: {
      name: "Cyan & Navy Palette",
      colors: [
        { name: "Navy Blue", hex: "#1E3A8A", role: "outlines" },
        { name: "Cyan", hex: "#06B6D4", role: "fills" },
        { name: "Light Cyan", hex: "#22D3EE", role: "highlights" },
        { name: "White", hex: "#FFFFFF", role: "background" },
      ],
    },
    referenceImageUrl: STYLE_REFERENCE_IMAGES.cyan_sketchline_vector,
  },
  {
    id: "warm_orange_flat",
    label: "Warm Orange Flat Illustration",
    description: "Warm orange/red flat illustration with strong contrast and almost white background",
    engines: ["nanobanana", "seedream", "nanopro"],
    basePrompt:
      "in the style of warm orange and red flat illustration, strong contrast on main subject, almost white background, bold colors, simplified shapes, modern flat design",
    referenceImageUrl: STYLE_REFERENCE_IMAGES.warm_orange_flat,
  },
  {
    id: "simple_cyan_test",
    label: "Simple Cyan (Test)",
    description: "Test style using simple concatenation template - same cyan vector look with minimal prompt structure",
    engines: ["nanobanana", "seedream", "nanopro"],
    basePrompt:
      "clean sketch-style vector line art, hand-drawn navy outlines on bright white space, subtle cyan-to-blue gradients, financial illustration vibe, minimalist details, flat color, high quality",
    defaultColors: {
      name: "Cyan & Navy Palette",
      colors: [
        { name: "Navy Blue", hex: "#1E3A8A", role: "outlines" },
        { name: "Cyan", hex: "#06B6D4", role: "fills" },
        { name: "Light Cyan", hex: "#22D3EE", role: "highlights" },
        { name: "White", hex: "#FFFFFF", role: "background" },
      ],
    },
    referenceImageUrl: STYLE_REFERENCE_IMAGES.simple_cyan_test,
  },
  {
    id: "cyan_sketchline_vector_v2",
    label: "Sketchline Vector V2 (Universal)",
    description: "Deep-blue outlines with cyan accents, flat 2D illustration, simple dot eyes, clean vector style",
    engines: ["nanobanana", "seedream", "nanopro"],
    basePrompt:
      "clean deep-blue line art, flat 2D illustration, soft cyan-to-blue gradient fills, simple facial features, no textures, no shadows",
    defaultColors: {
      name: "Deep Blue & Cyan Palette",
      colors: [
        { name: "Deep Blue", hex: "#002B5C", role: "outlines" },
        { name: "Cyan", hex: "#00AEEF", role: "accents" },
        { name: "Medium Blue", hex: "#0084D7", role: "gradients" },
        { name: "White", hex: "#FFFFFF", role: "background" },
      ],
    },
    referenceImageUrl: STYLE_REFERENCE_IMAGES.cyan_sketchline_vector_v2,
  },
];

const KIE_BASE_URL = "https://api.kie.ai/api/v1";
const KIE_API_KEY = process.env.KIE_API_KEY;

if (!KIE_API_KEY) {
  console.warn("Warning: KIE_API_KEY is not set. NanoBanana requests will fail.");
}

const NEGATIVE_PROMPT = `- inconsistent character identity
- incorrect character proportions
- distorted anatomy or broken limbs
- incorrect object scale (e.g., character larger than a car)
- broken perspective or impossible angles
- unwanted changes in clothing or hairstyle
- mismatched art style within the same scene
- unintended extra characters or duplicated faces
- chaotic or cluttered composition (unless references show it)
- low-quality details such as blurry shapes or noisy textures
- no clean vector edges unless the reference uses vector lines
- no high-saturation or neon colors
- no deviation from the reference style across all scenes
- no exaggerated gradients, strong shadows, or 3D effects
- no floating, intersecting, or merged shapes`;

function buildPrompt(
  userPrompt: string, 
  style: StylePreset & { basePrompt: string }, 
  hasUserReference: boolean = false,
  customTemplate?: any
) {
  // If custom template is provided, use it
  if (customTemplate) {
    return buildPromptFromTemplate(userPrompt, style, hasUserReference, customTemplate);
  }
  
  // Otherwise use default template
  const characterInstruction = hasUserReference 
    ? "\n\n**CRITICAL: Keep the exact same character appearance from the reference image. Maintain all visual characteristics including face, hairstyle, clothing, and body proportions.**\n"
    : "";
  
  return `PROMPT TEMPLATE

[SCENE — ${userPrompt}]${characterInstruction}

1. CAMERA & COMPOSITION
- Camera angle: stable, undistorted view that clearly presents the subject.
- Composition layout: balanced framing (${style.label} inspiration).
- Framing: ensure the subject fits naturally without clipping or distortion.
- Depth arrangement: clearly separated foreground, midground, and background with proper scale.

2. ENVIRONMENT
- Setting: ${userPrompt}.
- Lighting: soft, even light suitable for the scene.
- Atmosphere: match ${style.label} (${style.description}) tone.
- Background complexity: follow the same simplification level as the reference style.

3. MAIN CHARACTER
- Pose: natural posture derived from the described action.
- Expression: consistent with the character identity implied by the prompt.
- Interaction: accurately placed relative to props/environment with correct scale.
- Clothing: match character lock and respect ${style.basePrompt}.

4. SECONDARY OBJECTS & ACTION
- Vehicles, props, and signage follow the same stylization rules as ${style.label}.
- Motion cues remain subtle and clean; all objects obey correct scale and perspective.

5. STYLE ENFORCEMENT
- Apply ${style.basePrompt}.
- Maintain consistent color palette, lighting, texture density, and stroke treatment.
- Keep background, character, and object detail density uniform; no stylistic drift.

6. NEGATIVE PROMPT
${NEGATIVE_PROMPT}`.trim();
}

// Simple concatenation template builder
function buildSimplePrompt(
  userPrompt: string,
  style: StylePreset & { basePrompt: string },
  hasUserReference: boolean,
  template: any
): string {
  const suffix = template.suffix || "white background, 8k resolution";
  
  // Simple concatenation: scene, style basePrompt, suffix
  let prompt = `${userPrompt}, ${style.basePrompt}, ${suffix}`;
  
  // Add character lock instruction if user provided reference images
  if (hasUserReference) {
    prompt += "\n\n**CRITICAL: Keep the exact same character appearance from the reference image. Maintain all visual characteristics including face, hairstyle, clothing, and body proportions.**";
  }
  
  return prompt;
}

// V2 Universal template builder - simplified, structured prompt format
// Following the new architecture: short, structured prompt (40-70 words)
// Supports two palette modes:
// - loose: Uses descriptive text (loosePalette) - recommended for better gradient behavior
// - strict: Uses HEX array (strictPalette) - for brand color requirements
function buildUniversalPrompt(
  userPrompt: string,
  style: StylePreset & { basePrompt: string },
  hasUserReference: boolean,
  template: any,
  paletteOverride?: string[]
): string {
  const styleName = template.name || style.label;
  // Use template styleKeywords, but also incorporate style.basePrompt for context
  const styleKeywords = template.styleKeywords || style.basePrompt || "";
  const rules = template.rules || "";
  const negativePrompt = template.negativePrompt || "";
  
  // Determine palette mode: default to "loose" for better results
  const paletteMode = template.paletteMode || "loose";
  
  // Build framing instruction (can be enhanced with user framing selection later)
  const framing = hasUserReference 
    ? "Medium shot, balanced composition, keep exact character appearance from reference"
    : "Medium shot, balanced composition";
  
  // Assemble the final prompt following the universal structure
  let prompt = `[SCENE]
${userPrompt}

[FRAMING]
${framing}

[STYLE]
In ${styleName} style:
${styleKeywords}`;

  // Add color palette section based on palette mode
  if (paletteMode === "loose" && template.loosePalette) {
    // Loose mode: Use descriptive color text (recommended for better gradient behavior)
    prompt += `

[COLORS]
${template.loosePalette}`;
  } else {
    // Strict mode or fallback: Use HEX palette
    let palette: string[] = [];
    if (paletteOverride && paletteOverride.length > 0) {
      palette = paletteOverride;
    } else if (template.strictPalette && template.strictPalette.length > 0) {
      palette = template.strictPalette;
    } else if (template.defaultPalette && template.defaultPalette.length > 0) {
      // Legacy support: use defaultPalette if strictPalette not defined
      palette = template.defaultPalette;
    } else if (style.defaultColors?.colors) {
      // Fallback to style's default colors
      palette = style.defaultColors.colors.map((c: any) => c.hex);
    }
    
    if (palette.length > 0) {
      const paletteColors = palette.join(", ");
      prompt += `

[COLORS]
Use the following palette:
${paletteColors}.
Follow the palette's saturation and contrast.`;
    }
  }

  // Add rules section
  if (rules) {
    prompt += `

[RULES]
${rules}`;
  }

  // Note: Negative prompt is handled separately in the API call
  // but we can include it in the prompt for reference
  if (negativePrompt) {
    prompt += `

[NEGATIVE]
${negativePrompt}`;
  }

  return prompt.trim();
}

function buildPromptFromTemplate(
  userPrompt: string,
  style: StylePreset & { basePrompt: string },
  hasUserReference: boolean,
  template: any
) {
  // Check if this is a simple template
  if (template.templateType === "simple") {
    return buildSimplePrompt(userPrompt, style, hasUserReference, template);
  }
  
  // Check if this is a universal (v2) template
  if (template.templateType === "universal") {
    return buildUniversalPrompt(userPrompt, style, hasUserReference, template);
  }
  
  // Structured template (default/legacy)
  const characterInstruction = hasUserReference 
    ? "\n\n**CRITICAL: Keep the exact same character appearance from the reference image. Maintain all visual characteristics including face, hairstyle, clothing, and body proportions.**\n"
    : "";
  
  let prompt = `PROMPT TEMPLATE\n\n[SCENE — ${userPrompt}]${characterInstruction}\n\n`;

  if (template.cameraComposition?.enabled) {
    prompt += "1. CAMERA & COMPOSITION\n";
    prompt += `- Camera angle: ${template.cameraComposition.cameraAngle}\n`;
    prompt += `- Composition layout: ${template.cameraComposition.compositionLayout} (${style.label} inspiration)\n`;
    prompt += `- Framing: ${template.cameraComposition.framing}\n`;
    prompt += `- Depth arrangement: ${template.cameraComposition.depthArrangement}\n\n`;
  }

  if (template.environment?.enabled) {
    prompt += "2. ENVIRONMENT\n";
    const setting = template.environment.setting.replace("[Scene description]", userPrompt);
    prompt += `- Setting: ${setting}\n`;
    prompt += `- Lighting: ${template.environment.lighting}\n`;
    const atmosphere = template.environment.atmosphere.replace("match style tone", `match ${style.label} (${style.description}) tone`);
    prompt += `- Atmosphere: ${atmosphere}\n`;
    prompt += `- Background complexity: ${template.environment.backgroundComplexity}\n\n`;
  }

  if (template.mainCharacter?.enabled) {
    prompt += "3. MAIN CHARACTER\n";
    prompt += `- Pose: ${template.mainCharacter.pose}\n`;
    prompt += `- Expression: ${template.mainCharacter.expression}\n`;
    prompt += `- Interaction: ${template.mainCharacter.interaction}\n`;
    const clothing = template.mainCharacter.clothing.replace("match character lock and respect style", `match character lock and respect ${style.basePrompt}`);
    prompt += `- Clothing: ${clothing}\n\n`;
  }

  if (template.secondaryObjects?.enabled) {
    prompt += "4. SECONDARY OBJECTS & ACTION\n";
    const objects = template.secondaryObjects.objects.replace("follow the same stylization rules as the style preset", `follow the same stylization rules as ${style.label}`);
    prompt += `- Objects: ${objects}\n`;
    prompt += `- Motion cues: ${template.secondaryObjects.motionCues}\n`;
    prompt += `- Scale rules: ${template.secondaryObjects.scaleRules}\n\n`;
  }

  if (template.styleEnforcement?.enabled) {
    prompt += "5. STYLE ENFORCEMENT\n";
    prompt += `- Apply ${style.basePrompt}\n`;
    prompt += `- ${template.styleEnforcement.styleRules}\n`;
    
    // Handle color palette based on mode
    if (template.colorMode === "default") {
      // Explicit default mode: Do not specify colors, let AI learn from reference images
      // Skip color palette entirely - no color definitions in prompt
    } else if (template.customColors?.colors && template.customColors.colors.length > 0) {
      // Custom color palette (explicit or legacy templates with customColors but no colorMode)
      // Descriptive format with usage guidance
      prompt += "- Color palette:\n";
      template.customColors.colors.forEach((color: any, index: number) => {
        const usage = color.role ? ` (primarily for ${color.role})` : '';
        prompt += `  • ${color.hex.toUpperCase()} ${color.name}${usage}\n`;
      });
      prompt += "  • Maintain consistent use of these colors throughout the image\n";
    } else if (style.defaultColors?.colors) {
      // Style default colors (when template has no custom colors and colorMode not set to default)
      prompt += "- Color palette:\n";
      style.defaultColors.colors.forEach((color: any, index: number) => {
        const usage = color.role ? ` (primarily for ${color.role})` : '';
        prompt += `  • ${color.hex.toUpperCase()} ${color.name}${usage}\n`;
      });
      prompt += "  • Maintain consistent use of these colors throughout the image\n";
    } else {
      // Fallback to text description
      prompt += `- Color palette: ${template.styleEnforcement.colorPalette}\n`;
    }
    
    prompt += `- Texture density: ${template.styleEnforcement.textureDensity}\n\n`;
  }

  if (template.negativePrompt?.enabled) {
    prompt += "6. NEGATIVE PROMPT\n";
    prompt += template.negativePrompt.items;
  }

  return prompt.trim();
}

async function callNanoBananaEdit(prompt: string, imageUrls: string[]) {
  if (!KIE_API_KEY) {
    throw new Error("KIE_API_KEY is not set in the environment");
  }

  const createResponse = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KIE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/nano-banana-edit",
      input: {
        prompt,
        image_urls: imageUrls,
        output_format: "png",
        image_size: "16:9",
      },
    }),
  });

  const createJson = await createResponse.json();

  if (!createResponse.ok || createJson.code !== 200) {
    throw new Error(`NanoBanana failed to create task: ${createResponse.status} ${createJson.message ?? ""}`);
  }

  const taskId = createJson.data?.taskId;
  if (!taskId) {
    throw new Error("NanoBanana response missing taskId");
  }

  return await pollNanoBananaResult(taskId);
}

async function pollNanoBananaResult(taskId: string) {
  const maxAttempts = 40;
  const delayMs = 3000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const resultResponse = await fetch(`${KIE_BASE_URL}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KIE_API_KEY}`,
      },
    });

    const resultJson = await resultResponse.json();

    if (!resultResponse.ok || resultJson.code !== 200) {
      throw new Error(`NanoBanana failed to query task: ${resultResponse.status} ${resultJson.message ?? ""}`);
    }

    const state = resultJson.data?.state;
    console.log(`[NanoBanana] Attempt ${attempt + 1}/${maxAttempts}, state: ${state}`);
    
    // Continue polling for any in-progress states
    if (state === "waiting" || state === "queuing" || state === "queued" || state === "generating" || state === "processing") {
      continue;
    }

    if (state === "fail") {
      const failMsg = resultJson.data?.failMsg || "NanoBanana task failed";
      console.error(`[NanoBanana] Task failed: ${failMsg}`);
      throw new Error(failMsg);
    }

    if (state === "success") {
      const resultField = resultJson.data?.resultJson;
      if (!resultField) {
        throw new Error("NanoBanana result missing resultJson");
      }

      const parsed = JSON.parse(resultField);
      const url = parsed.resultUrls?.[0];
      if (!url) {
        throw new Error("NanoBanana result missing result URL");
      }
      console.log(`[NanoBanana] Task completed successfully: ${url}`);
      return url;
    }
    
    // Handle unknown states - log and continue polling rather than failing immediately
    console.warn(`[NanoBanana] Unknown state '${state}', continuing to poll...`);
  }

  console.error(`[NanoBanana] Task timed out after ${maxAttempts * delayMs / 1000} seconds`);
  throw new Error("NanoBanana task timed out");
}

async function callSeedreamEdit(prompt: string, imageUrls: string[]) {
  if (!KIE_API_KEY) {
    throw new Error("KIE_API_KEY is not set in the environment");
  }

  // Seedream API supports up to 10 image inputs
  if (imageUrls.length > 10) {
    throw new Error(`Seedream supports up to 10 reference images, but ${imageUrls.length} were provided`);
  }

  const createResponse = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KIE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "bytedance/seedream-v4-edit",
      input: {
        prompt,
        image_urls: imageUrls,
        image_size: "landscape_16_9",
        image_resolution: "2K",
        max_images: 1,
      },
    }),
  });

  const createJson = await createResponse.json();

  if (!createResponse.ok || createJson.code !== 200) {
    throw new Error(`Seedream failed to create task: ${createResponse.status} ${createJson.msg ?? ""}`);
  }

  const taskId = createJson.data?.taskId;
  if (!taskId) {
    throw new Error("Seedream response missing taskId");
  }

  return await pollSeedreamResult(taskId);
}

async function pollSeedreamResult(taskId: string) {
  const maxAttempts = 30;
  const delayMs = 3000;

  console.log(`[Seedream] Starting to poll task ${taskId} (max ${maxAttempts} attempts, ${delayMs}ms delay)`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const resultResponse = await fetch(`${KIE_BASE_URL}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KIE_API_KEY}`,
      },
    });

    const resultJson = await resultResponse.json();

    if (!resultResponse.ok || resultJson.code !== 200) {
      throw new Error(`Seedream failed to query task: ${resultResponse.status} ${resultJson.msg ?? ""}`);
    }

    const state = resultJson.data?.state;
    console.log(`[Seedream] Polling attempt ${attempt + 1}/${maxAttempts}: state="${state}"`);

    if (state === "waiting" || state === "queuing" || state === "generating") {
      continue;
    }

    if (state === "fail") {
      const failMsg = resultJson.data?.failMsg || "Seedream task failed";
      console.error(`[Seedream] Task failed: ${failMsg}`);
      throw new Error(failMsg);
    }

    if (state === "success") {
      const resultField = resultJson.data?.resultJson;
      if (!resultField) {
        throw new Error("Seedream result missing resultJson");
      }

      const parsed = JSON.parse(resultField);
      const url = parsed.resultUrls?.[0];
      if (!url) {
        throw new Error("Seedream result missing result URL");
      }
      console.log(`[Seedream] Task completed successfully: ${url}`);
      return url;
    }
  }

  console.error(`[Seedream] Task timed out after ${maxAttempts * delayMs / 1000} seconds`);
  throw new Error("Seedream task timed out");
}

// Nano Banana Pro API - Higher quality with 2K/4K resolution support
async function callNanoProEdit(prompt: string, imageUrls: string[]) {
  if (!KIE_API_KEY) {
    throw new Error("KIE_API_KEY is not set in the environment");
  }

  // Nano Pro supports up to 8 reference images
  if (imageUrls.length > 8) {
    console.warn(`[NanoPro] Truncating ${imageUrls.length} images to 8 (API limit)`);
  }
  const limitedImageUrls = imageUrls.slice(0, 8);

  const createResponse = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KIE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "nano-banana-pro",
      input: {
        prompt,
        image_input: limitedImageUrls,
        aspect_ratio: "16:9",
        resolution: "2K",
        output_format: "png",
      },
    }),
  });

  const createJson = await createResponse.json();

  if (!createResponse.ok || createJson.code !== 200) {
    throw new Error(`NanoPro failed to create task: ${createResponse.status} ${createJson.msg ?? ""}`);
  }

  const taskId = createJson.data?.taskId;
  if (!taskId) {
    throw new Error("NanoPro response missing taskId");
  }

  return await pollNanoProResult(taskId);
}

async function pollNanoProResult(taskId: string) {
  // Nano Pro may take longer due to higher quality processing
  const maxAttempts = 60;
  const delayMs = 3000;

  console.log(`[NanoPro] Starting to poll task ${taskId} (max ${maxAttempts} attempts, ${delayMs}ms delay)`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const resultResponse = await fetch(`${KIE_BASE_URL}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KIE_API_KEY}`,
      },
    });

    const resultJson = await resultResponse.json();

    if (!resultResponse.ok || resultJson.code !== 200) {
      throw new Error(`NanoPro failed to query task: ${resultResponse.status} ${resultJson.msg ?? ""}`);
    }

    const state = resultJson.data?.state;
    console.log(`[NanoPro] Polling attempt ${attempt + 1}/${maxAttempts}: state="${state}"`);

    // Continue polling for any in-progress states
    if (state === "waiting" || state === "queuing" || state === "queued" || state === "generating" || state === "processing") {
      continue;
    }

    if (state === "fail") {
      const failMsg = resultJson.data?.failMsg || "NanoPro task failed";
      console.error(`[NanoPro] Task failed: ${failMsg}`);
      throw new Error(failMsg);
    }

    if (state === "success") {
      const resultField = resultJson.data?.resultJson;
      if (!resultField) {
        throw new Error("NanoPro result missing resultJson");
      }

      const parsed = JSON.parse(resultField);
      const url = parsed.resultUrls?.[0];
      if (!url) {
        throw new Error("NanoPro result missing result URL");
      }
      console.log(`[NanoPro] Task completed successfully: ${url}`);
      return url;
    }

    // Handle unknown states - log and continue polling
    console.warn(`[NanoPro] Unknown state '${state}', continuing to poll...`);
  }

  console.error(`[NanoPro] Task timed out after ${maxAttempts * delayMs / 1000} seconds`);
  throw new Error("NanoPro task timed out");
}

// Get all reference image file paths for a style from the file system
function getStyleReferenceImagePaths(styleId: string): string[] {
  const styleDir = join(__dirname, "..", "client", "public", "reference-images", styleId);
  
  if (!existsSync(styleDir) || !statSync(styleDir).isDirectory()) {
    return [];
  }

  try {
    const files = readdirSync(styleDir);
    const imagePaths = files
      .filter((file) => {
        const ext = extname(file).toLowerCase();
        return [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);
      })
      .map((file) => `/reference-images/${styleId}/${file}`);
    
    return imagePaths;
  } catch (error) {
    console.error(`Error reading style directory ${styleId}:`, error);
    return [];
  }
}

// In-memory cache for uploaded image URLs to avoid re-uploading
// Store promises to handle concurrent requests for the same image
const uploadCache = new Map<string, Promise<string>>();

async function uploadImageOnDemand(relativePath: string, styleId: string): Promise<string> {
  // If the path is already an HTTPS URL (from previously uploaded images), return it directly
  if (relativePath.startsWith('https://') || relativePath.startsWith('http://')) {
    console.log(`Using existing uploaded URL: ${relativePath}`);
    return relativePath;
  }
  
  const cacheKey = `${styleId}:${relativePath}`;
  
  // Check if upload is already in progress or completed
  if (uploadCache.has(cacheKey)) {
    return uploadCache.get(cacheKey)!;
  }

  // Build absolute file path
  // Remove leading slash from relativePath to prevent path.join from discarding base path
  const normalizedPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  const referenceImagesPath = join(__dirname, "..", "client", "public");
  const fullPath = join(referenceImagesPath, normalizedPath);

  // Create and cache the upload promise to prevent duplicate uploads
  const uploadPromise = (async () => {
    try {
      console.log(`Uploading on-demand: ${relativePath}`);
      // Extract filename for upload path
      const fileName = relativePath.split('/').pop() || 'unknown';
      const uploadPath = `reference-images/${styleId}`;
      
      const uploaded = await uploadFileToKIE(fullPath, uploadPath, fileName);
      console.log(`✓ Uploaded: ${uploaded.fileUrl}`);
      
      return uploaded.fileUrl;
    } catch (error) {
      console.error(`Failed to upload ${relativePath}:`, error);
      // Remove failed upload from cache to allow retry
      uploadCache.delete(cacheKey);
      throw error;
    }
  })();

  // Cache the promise immediately to prevent concurrent uploads
  uploadCache.set(cacheKey, uploadPromise);
  
  return uploadPromise;
}

async function initializeReferenceImages() {
  // No longer uploading images at startup
  // Images will be uploaded on-demand when needed
  console.log("\n=== Reference Images On-Demand Mode ===");
  console.log("Images will be uploaded only when used in generation");
  console.log("=======================================\n");
}

// Helper function to seed built-in styles to database
async function seedBuiltInStyles() {
  try {
    const builtInStyles = STYLE_PRESETS.map(({ id, label, description, engines, basePrompt, defaultColors, referenceImageUrl }) => ({
      id,
      label,
      description,
      engines,
      basePrompt,
      defaultColors,
      referenceImageUrl,
      isBuiltIn: true,
    }));
    await storage.seedBuiltInStyles(builtInStyles);
    console.log("Built-in styles seeded to database");
  } catch (error) {
    console.error("Failed to seed built-in styles:", error);
  }
}

// Helper function to get style by ID (from database or fallback to static)
async function getStyleById(styleId: string): Promise<(StylePreset & { basePrompt: string; referenceImageUrl: string; isBuiltIn?: boolean }) | undefined> {
  // Try database first
  const dbStyle = await storage.getStyle(styleId);
  if (dbStyle) {
    return {
      id: dbStyle.id,
      label: dbStyle.label,
      description: dbStyle.description,
      engines: dbStyle.engines,
      basePrompt: dbStyle.basePrompt,
      defaultColors: dbStyle.defaultColors as StylePreset["defaultColors"],
      referenceImageUrl: dbStyle.referenceImageUrl,
      isBuiltIn: dbStyle.isBuiltIn,
    };
  }
  // Fallback to static array for backward compatibility
  return STYLE_PRESETS.find(s => s.id === styleId);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed built-in styles to database on startup
  await seedBuiltInStyles();

  // GET /api/styles - Return available style presets (from database)
  // This endpoint provides the list of style options for the frontend dropdown
  // Uses the first reference image from the style's template as thumbnail
  app.get("/api/styles", async (req, res) => {
    try {
      // Get styles from database
      const dbStyles = await storage.getAllStyles();
      
      if (dbStyles.length > 0) {
        // For each style, get its template to find the first reference image
        const stylesForFrontend = await Promise.all(
          dbStyles.map(async ({ id, label, description, engines, basePrompt, defaultColors, isBuiltIn, referenceImageUrl }) => {
            // Try to get template's first reference image
            let thumbnailUrl = referenceImageUrl;
            
            // Check database template first
            const dbTemplate = await storage.getTemplate(id);
            if (dbTemplate?.referenceImages && dbTemplate.referenceImages.length > 0) {
              thumbnailUrl = dbTemplate.referenceImages[0];
            } else {
              // Fall back to default template if exists
              const defaultTemplate = getDefaultTemplate(id);
              if (defaultTemplate?.referenceImages && defaultTemplate.referenceImages.length > 0) {
                thumbnailUrl = defaultTemplate.referenceImages[0];
              }
            }
            
            return {
              id,
              label,
              description,
              engines,
              basePrompt,
              defaultColors,
              isBuiltIn,
              referenceImageUrl: thumbnailUrl,
            };
          })
        );
        return res.json(stylesForFrontend);
      }
      
      // Fallback to static styles if database is empty
      const stylesForFrontend = await Promise.all(
        STYLE_PRESETS.map(async ({ id, label, description, engines, basePrompt, defaultColors, referenceImageUrl }) => {
          // Try to get default template's first reference image
          let thumbnailUrl = referenceImageUrl;
          const defaultTemplate = getDefaultTemplate(id);
          if (defaultTemplate?.referenceImages && defaultTemplate.referenceImages.length > 0) {
            thumbnailUrl = defaultTemplate.referenceImages[0];
          }
          
          return {
            id,
            label,
            description,
            engines,
            basePrompt,
            defaultColors,
            isBuiltIn: true,
            referenceImageUrl: thumbnailUrl,
          };
        })
      );
      res.json(stylesForFrontend);
    } catch (error) {
      console.error("Error fetching styles:", error);
      // Fallback to static styles on error
      const stylesForFrontend = STYLE_PRESETS.map(({ id, label, description, engines, basePrompt, defaultColors, referenceImageUrl }) => ({
        id,
        label,
        description,
        engines,
        basePrompt,
        defaultColors,
        isBuiltIn: true,
        referenceImageUrl,
      }));
      res.json(stylesForFrontend);
    }
  });

  // POST /api/styles - Create a new custom style
  app.post("/api/styles", async (req, res) => {
    try {
      const { id, label, description, engines, basePrompt, defaultColors, referenceImageUrl } = req.body;
      
      if (!id || !label || !description || !engines || !basePrompt) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Check if style ID already exists
      const existing = await storage.getStyle(id);
      if (existing) {
        return res.status(409).json({ error: "Style ID already exists" });
      }
      
      const newStyle = await storage.createStyle({
        id,
        label,
        description,
        engines,
        basePrompt,
        defaultColors,
        referenceImageUrl: referenceImageUrl || DEFAULT_REFERENCE_IMAGE,
        isBuiltIn: false,
      });
      
      res.status(201).json(newStyle);
    } catch (error) {
      console.error("Error creating style:", error);
      res.status(500).json({ error: "Failed to create style" });
    }
  });

  // POST /api/styles/:id/clone - Clone an existing style
  app.post("/api/styles/:id/clone", async (req, res) => {
    try {
      const sourceId = req.params.id;
      const { newId, newLabel } = req.body;
      
      if (!newId || !newLabel) {
        return res.status(400).json({ error: "newId and newLabel are required" });
      }
      
      // Check if new ID already exists
      const existingNew = await storage.getStyle(newId);
      if (existingNew) {
        return res.status(409).json({ error: "New style ID already exists" });
      }
      
      // Get source style
      const sourceStyle = await getStyleById(sourceId);
      if (!sourceStyle) {
        return res.status(404).json({ error: "Source style not found" });
      }
      
      // Create cloned style
      const clonedStyle = await storage.createStyle({
        id: newId,
        label: newLabel,
        description: sourceStyle.description,
        engines: sourceStyle.engines,
        basePrompt: sourceStyle.basePrompt,
        defaultColors: sourceStyle.defaultColors,
        referenceImageUrl: sourceStyle.referenceImageUrl,
        isBuiltIn: false,
      });
      
      // Clone template if exists
      const sourceTemplate = await storage.getTemplate(sourceId);
      if (sourceTemplate) {
        await storage.saveTemplate(
          newId,
          sourceTemplate.templateData,
          sourceTemplate.referenceImages || []
        );
      }
      
      res.status(201).json(clonedStyle);
    } catch (error) {
      console.error("Error cloning style:", error);
      res.status(500).json({ error: "Failed to clone style" });
    }
  });

  // DELETE /api/styles/:id - Delete a custom style (only non-built-in)
  app.delete("/api/styles/:id", async (req, res) => {
    try {
      const styleId = req.params.id;
      
      const style = await storage.getStyle(styleId);
      if (!style) {
        return res.status(404).json({ error: "Style not found" });
      }
      
      if (style.isBuiltIn) {
        return res.status(403).json({ error: "Cannot delete built-in styles" });
      }
      
      await storage.deleteStyle(styleId);
      res.status(200).json({ success: true, message: "Style deleted" });
    } catch (error) {
      console.error("Error deleting style:", error);
      res.status(500).json({ error: "Failed to delete style" });
    }
  });

  // POST /api/generate - Generate an image based on prompt, style, and engine
  app.post("/api/generate", async (req, res) => {
    try {
      const validationResult = generateRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        console.error("\n=== Validation Failed for /api/generate ===");
        console.error("Request body:", JSON.stringify(req.body, null, 2));
        console.error("Validation errors:", JSON.stringify(validationResult.error.errors, null, 2));
        console.error("==========================================\n");
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const { prompt, styleId, engine, userReferenceImages, customTemplate, templateReferenceImages, sceneId } = validationResult.data;
      
      // Get style from database (or fallback to static)
      const selectedStyle = await getStyleById(styleId);

      if (!selectedStyle) {
        return res.status(400).json({
          error: "Invalid style",
          message: `Style '${styleId}' not found`,
        });
      }

      if (!selectedStyle.engines.includes(engine)) {
        return res.status(400).json({
          error: "Invalid engine",
          message: `Engine '${engine}' is not supported for style '${styleId}'. Supported engines: ${selectedStyle.engines.join(", ")}`,
        });
      }

      const hasUserReference = !!(userReferenceImages && userReferenceImages.length > 0);
      
      // Try to load template from database if no customTemplate provided
      let templateToUse: any = customTemplate;
      let dbTemplateReferenceImages: string[] = [];
      
      if (!templateToUse) {
        try {
          const dbTemplate = await storage.getTemplate(styleId);
          if (dbTemplate && dbTemplate.templateData) {
            // Cast from jsonb object to any for template processing
            templateToUse = dbTemplate.templateData as any;
            dbTemplateReferenceImages = dbTemplate.referenceImages || [];
            console.log(`Loaded template from database for style: ${styleId}`);
          }
        } catch (error) {
          console.log(`No saved template found for style: ${styleId}, using default`);
        }
      }
      
      // Use the template (from request, database, or default)
      const finalPrompt = buildPrompt(prompt, selectedStyle, hasUserReference, templateToUse);

      // Build image URLs array with priority order:
      // 1. User-selected reference images (highest priority)
      // 2. Template reference images (from Prompt Editor)
      // 3. Style preset reference images (uploaded from public/reference-images)
      const imageUrls: string[] = [];
      
      if (userReferenceImages && userReferenceImages.length > 0) {
        imageUrls.push(...userReferenceImages);
      }
      
      // Add template reference images if exists (from request or database)
      const allTemplateReferenceImages = templateReferenceImages?.length 
        ? templateReferenceImages 
        : dbTemplateReferenceImages;
        
      if (allTemplateReferenceImages && allTemplateReferenceImages.length > 0) {
        console.log(`Uploading ${allTemplateReferenceImages.length} template reference images on-demand...`);
        const uploadPromises = allTemplateReferenceImages.map(async (path) => {
          try {
            // Upload image on-demand (uses cache if already uploaded)
            return await uploadImageOnDemand(path, styleId);
          } catch (error) {
            console.error(`Failed to upload template image ${path}:`, error);
            return null;
          }
        });
        
        const uploadedUrls = await Promise.all(uploadPromises);
        const validUrls = uploadedUrls.filter((url): url is string => url !== null);
        imageUrls.push(...validUrls);
      }
      
      // Add style preset reference images (upload on-demand with deduplication)
      // Get all reference image file paths from the file system
      const styleReferencePaths = getStyleReferenceImagePaths(styleId);
      
      if (styleReferencePaths.length > 0) {
        // Normalize URLs/paths to enable proper comparison
        // Extracts the relative path portion (e.g., "/reference-images/style-1/1.png")
        const normalizePathForComparison = (urlOrPath: string): string => {
          // If it's an HTTP(S) URL, extract the path portion after the domain
          if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
            try {
              const url = new URL(urlOrPath);
              // Extract path after domain, look for /reference-images/ pattern
              const match = url.pathname.match(/\/reference-images\/.*$/);
              return match ? match[0] : urlOrPath;
            } catch {
              return urlOrPath;
            }
          }
          
          // For local paths, ensure consistent format with leading slash
          // Handle both "/reference-images/..." and "reference-images/..."
          if (urlOrPath.includes('reference-images/')) {
            // Extract everything from "reference-images/" onward
            const match = urlOrPath.match(/reference-images\/.*$/);
            if (match) {
              // Return with leading slash for consistency
              return '/' + match[0];
            }
          }
          
          return urlOrPath;
        };
        
        // Build set of existing normalized paths for deduplication
        const existingNormalizedPaths = new Set(
          imageUrls.map(url => normalizePathForComparison(url))
        );
        
        // Filter out any paths that already exist (by full normalized path, not just filename)
        const uniquePaths = styleReferencePaths.filter(path => {
          const normalizedPath = normalizePathForComparison(path);
          const isUnique = !existingNormalizedPaths.has(normalizedPath);
          if (!isUnique) {
            console.log(`Skipping duplicate reference image: ${normalizedPath}`);
          }
          return isUnique;
        });
        
        // Determine how many style images to upload
        let pathsToUpload = uniquePaths;
        if (engine === "seedream") {
          const MAX_SEEDREAM_REFS = 4;
          const currentRefCount = imageUrls.length;
          const maxStyleRefs = Math.max(0, MAX_SEEDREAM_REFS - currentRefCount);
          pathsToUpload = uniquePaths.slice(0, maxStyleRefs);
        }
        
        // Upload style preset images on-demand
        if (pathsToUpload.length > 0) {
          console.log(`Uploading ${pathsToUpload.length} style preset images on-demand...`);
          const styleUploadPromises = pathsToUpload.map(async (path) => {
            try {
              return await uploadImageOnDemand(path, styleId);
            } catch (error) {
              console.error(`Failed to upload style preset image ${path}:`, error);
              return null;
            }
          });
          
          const styleUploadedUrls = await Promise.all(styleUploadPromises);
          const validStyleUrls = styleUploadedUrls.filter((url): url is string => url !== null);
          imageUrls.push(...validStyleUrls);
        }
      }

      console.log("\n=== Image Generation Request ===");
      console.log(`Engine: ${engine}`);
      console.log(`Style: ${selectedStyle.label} (${styleId})`);
      console.log(`User Prompt: ${prompt}`);
      console.log(`User Reference Images: ${userReferenceImages?.join(", ") || "None"}`);
      console.log(`Template Reference Images: ${templateReferenceImages?.join(", ") || "None"}`);
      console.log(`Image URLs (priority order): ${imageUrls.join(", ")}`);
      console.log(`Final Prompt: ${finalPrompt}`);
      console.log("================================\n");

      // Route to appropriate engine
      let imageUrl: string;
      if (engine === "nanobanana") {
        imageUrl = await callNanoBananaEdit(finalPrompt, imageUrls);
      } else if (engine === "nanopro") {
        imageUrl = await callNanoProEdit(finalPrompt, imageUrls);
      } else {
        imageUrl = await callSeedreamEdit(finalPrompt, imageUrls);
      }

      let historyId: number | undefined;
      try {
        const savedHistory = await storage.saveGenerationHistory({
          prompt,
          styleId,
          styleLabel: selectedStyle.label,
          engine,
          finalPrompt,
          referenceImageUrl: selectedStyle.referenceImageUrl,
          userReferenceUrls: userReferenceImages || undefined,
          allReferenceImageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          generatedImageUrl: imageUrl,
          sceneId: sceneId || null,
        });
        historyId = savedHistory.id;
        console.log(`✓ Saved to history with ID: ${historyId}${sceneId ? ` (Scene ${sceneId})` : ''}`);
      } catch (dbError) {
        console.error("Failed to save generation history:", dbError);
      }

      const responseValidation = generateResponseSchema.safeParse({ imageUrl, historyId });

      if (!responseValidation.success) {
        console.error("Response validation failed:", responseValidation.error);
        return res.status(500).json({
          error: "Internal server error",
          message: "Failed to generate valid response",
        });
      }

      res.json(responseValidation.data);
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to generate image",
      });
    }
  });

  app.get("/api/history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const history = await storage.getGenerationHistory(limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching generation history:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch generation history",
      });
    }
  });

  app.get("/api/history/scene/:sceneId", async (req, res) => {
    try {
      const sceneId = parseInt(req.params.sceneId, 10);
      if (isNaN(sceneId)) {
        return res.status(400).json({
          error: "Invalid scene ID",
          message: "Scene ID must be a number",
        });
      }
      const history = await storage.getGenerationHistoryBySceneId(sceneId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching scene history:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch scene history",
      });
    }
  });

  app.get("/api/templates/:styleId", async (req, res) => {
    try {
      const { styleId } = req.params;
      
      if (!styleId) {
        return res.status(400).json({
          error: "Missing styleId",
          message: "styleId parameter is required",
        });
      }

      const template = await storage.getTemplate(styleId);
      
      if (!template) {
        return res.status(404).json({
          error: "Template not found",
          message: `No template found for style '${styleId}'`,
        });
      }

      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch template",
      });
    }
  });

  app.post("/api/templates/:styleId", async (req, res) => {
    try {
      const { styleId } = req.params;
      const { templateData, referenceImages } = req.body;

      if (!styleId || !templateData) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "styleId and templateData are required",
        });
      }

      const saved = await storage.saveTemplate(
        styleId,
        templateData,
        referenceImages || []
      );

      res.json(saved);
    } catch (error) {
      console.error("Error saving template:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to save template",
      });
    }
  });

  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching all templates:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch templates",
      });
    }
  });

  app.get("/api/default-templates", (req, res) => {
    res.json(DEFAULT_TEMPLATES);
  });

  app.get("/api/default-templates/:styleId", (req, res) => {
    const { styleId } = req.params;
    const defaultTemplate = getDefaultTemplate(styleId);
    
    if (!defaultTemplate) {
      return res.status(404).json({
        error: "Default template not found",
        message: `No default template found for style '${styleId}'`,
      });
    }
    
    res.json(defaultTemplate);
  });

  app.post("/api/templates/:styleId/reset", async (req, res) => {
    try {
      const { styleId } = req.params;
      const defaultTemplate = getDefaultTemplate(styleId);
      
      if (!defaultTemplate) {
        return res.status(404).json({
          error: "Default template not found",
          message: `No default template found for style '${styleId}'`,
        });
      }
      
      const saved = await storage.saveTemplate(
        defaultTemplate.styleId,
        defaultTemplate.templateData,
        defaultTemplate.referenceImages
      );
      
      console.log(`✓ Reset template for style: ${styleId}`);
      res.json(saved);
    } catch (error) {
      console.error("Error resetting template:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to reset template",
      });
    }
  });

  app.post("/api/templates/reset-all", async (req, res) => {
    try {
      const results = [];
      
      for (const template of DEFAULT_TEMPLATES) {
        try {
          const saved = await storage.saveTemplate(
            template.styleId,
            template.templateData,
            template.referenceImages
          );
          results.push({ styleId: template.styleId, success: true, template: saved });
          console.log(`✓ Reset template for style: ${template.styleId}`);
        } catch (error) {
          results.push({ styleId: template.styleId, success: false, error: String(error) });
          console.error(`✗ Failed to reset template for ${template.styleId}:`, error);
        }
      }
      
      res.json({
        message: "Templates reset complete",
        results,
      });
    } catch (error) {
      console.error("Error resetting all templates:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to reset all templates",
      });
    }
  });

  app.post("/api/upload-reference-image", async (req, res) => {
    try {
      const { styleId, imageBase64, fileName } = req.body;

      if (!styleId || !imageBase64 || !fileName) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "styleId, imageBase64, and fileName are required",
        });
      }

      // Validate styleId exists (check both presets and database)
      const presetExists = STYLE_PRESETS.some((s) => s.id === styleId);
      const dbTemplate = await storage.getTemplate(styleId);
      if (!presetExists && !dbTemplate) {
        return res.status(400).json({
          error: "Invalid styleId",
          message: `Style '${styleId}' does not exist`,
        });
      }

      // Create directory if it doesn't exist
      const { mkdirSync, writeFileSync, existsSync } = await import("fs");
      const styleDir = join(__dirname, "..", "client", "public", "reference-images", styleId);
      
      if (!existsSync(styleDir)) {
        mkdirSync(styleDir, { recursive: true });
      }

      // Convert base64 to buffer and save
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const filePath = join(styleDir, fileName);
      writeFileSync(filePath, buffer);

      // Upload to KIE
      const uploaded = await uploadFileToKIE(filePath, `reference-images/${styleId}`, fileName);

      // Update uploadedReferenceImages cache
      const existingStyle = uploadedReferenceImages.find((s) => s.styleId === styleId);
      if (existingStyle) {
        existingStyle.imageUrls.push(uploaded.fileUrl);
      } else {
        uploadedReferenceImages.push({
          styleId,
          imageUrls: [uploaded.fileUrl],
        });
      }

      // Update style preset reference URL if it's the first image
      const preset = STYLE_PRESETS.find((p) => p.id === styleId);
      if (preset && preset.referenceImageUrl === DEFAULT_REFERENCE_IMAGE) {
        preset.referenceImageUrl = uploaded.fileUrl;
      }

      console.log(`✓ Saved and uploaded reference image: ${styleId}/${fileName}`);

      res.json({
        success: true,
        localPath: `/reference-images/${styleId}/${fileName}`,
        kieUrl: uploaded.fileUrl,
      });
    } catch (error) {
      console.error("Error uploading reference image:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to upload reference image",
      });
    }
  });

  // ===== Storyboard API =====

  // Get all storyboards
  app.get("/api/storyboards", async (req, res) => {
    try {
      const storyboards = await storage.getAllStoryboards();
      res.json(storyboards);
    } catch (error) {
      console.error("Error fetching storyboards:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch storyboards",
      });
    }
  });

  // Get single storyboard
  app.get("/api/storyboards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          error: "Invalid ID",
          message: "Storyboard ID must be a number",
        });
      }

      const storyboard = await storage.getStoryboard(id);
      if (!storyboard) {
        return res.status(404).json({
          error: "Not found",
          message: `Storyboard ${id} not found`,
        });
      }

      res.json(storyboard);
    } catch (error) {
      console.error("Error fetching storyboard:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch storyboard",
      });
    }
  });

  // Create a new storyboard
  app.post("/api/storyboards", async (req, res) => {
    try {
      const { name, description, styleId, engine } = req.body;
      
      if (!name || name.trim() === "") {
        return res.status(400).json({
          error: "Invalid request",
          message: "Storyboard name is required",
        });
      }

      const storyboard = await storage.createStoryboard({
        name: name.trim(),
        description: description || "",
        styleId: styleId || null,
        engine: engine || null,
      });
      
      res.json(storyboard);
    } catch (error) {
      console.error("Error creating storyboard:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to create storyboard",
      });
    }
  });

  // Update a storyboard
  app.patch("/api/storyboards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          error: "Invalid ID",
          message: "Storyboard ID must be a number",
        });
      }

      const { name, description, styleId, engine } = req.body;
      
      const storyboard = await storage.updateStoryboard(id, {
        name,
        description,
        styleId,
        engine,
      });

      if (!storyboard) {
        return res.status(404).json({
          error: "Not found",
          message: `Storyboard ${id} not found`,
        });
      }

      res.json(storyboard);
    } catch (error) {
      console.error("Error updating storyboard:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update storyboard",
      });
    }
  });

  // Delete a storyboard
  app.delete("/api/storyboards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          error: "Invalid ID",
          message: "Storyboard ID must be a number",
        });
      }

      const deleted = await storage.deleteStoryboard(id);
      
      if (!deleted) {
        return res.status(404).json({
          error: "Not found",
          message: `Storyboard ${id} not found`,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting storyboard:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete storyboard",
      });
    }
  });

  // ===== Storyboard Version API =====

  // Get all versions for a storyboard
  app.get("/api/storyboards/:id/versions", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          error: "Invalid ID",
          message: "Storyboard ID must be a number",
        });
      }

      const versions = await storage.getStoryboardVersions(id);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching storyboard versions:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch storyboard versions",
      });
    }
  });

  // Create a new version (save current state)
  app.post("/api/storyboards/:id/versions", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          error: "Invalid ID",
          message: "Storyboard ID must be a number",
        });
      }

      const { name, description } = req.body;
      
      if (!name || name.trim() === "") {
        return res.status(400).json({
          error: "Invalid request",
          message: "Version name is required",
        });
      }

      const version = await storage.createStoryboardVersion(id, name.trim(), description || "");
      res.json(version);
    } catch (error: any) {
      console.error("Error creating storyboard version:", error);
      if (error.message === "Storyboard not found") {
        return res.status(404).json({
          error: "Not found",
          message: "Storyboard not found",
        });
      }
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to create storyboard version",
      });
    }
  });

  // Restore a version
  app.post("/api/storyboards/versions/:versionId/restore", async (req, res) => {
    try {
      const versionId = parseInt(req.params.versionId, 10);
      if (isNaN(versionId)) {
        return res.status(400).json({
          error: "Invalid ID",
          message: "Version ID must be a number",
        });
      }

      const storyboard = await storage.restoreStoryboardVersion(versionId);
      
      if (!storyboard) {
        return res.status(404).json({
          error: "Not found",
          message: "Version or storyboard not found",
        });
      }

      res.json({ success: true, storyboard });
    } catch (error) {
      console.error("Error restoring storyboard version:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to restore storyboard version",
      });
    }
  });

  // Delete a version
  app.delete("/api/storyboards/versions/:versionId", async (req, res) => {
    try {
      const versionId = parseInt(req.params.versionId, 10);
      if (isNaN(versionId)) {
        return res.status(400).json({
          error: "Invalid ID",
          message: "Version ID must be a number",
        });
      }

      const deleted = await storage.deleteStoryboardVersion(versionId);
      
      if (!deleted) {
        return res.status(404).json({
          error: "Not found",
          message: `Version ${versionId} not found`,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting storyboard version:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete storyboard version",
      });
    }
  });

  // ===== Storyboard Scene API =====
  
  // Get all scenes (legacy - returns all scenes regardless of storyboard)
  app.get("/api/scenes", async (req, res) => {
    try {
      const storyboardId = req.query.storyboardId;
      
      if (storyboardId) {
        const id = parseInt(storyboardId as string, 10);
        if (isNaN(id)) {
          return res.status(400).json({
            error: "Invalid ID",
            message: "Storyboard ID must be a number",
          });
        }
        const scenes = await storage.getScenesByStoryboardId(id);
        return res.json(scenes);
      }
      
      const scenes = await storage.getAllScenes();
      res.json(scenes);
    } catch (error) {
      console.error("Error fetching scenes:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch scenes",
      });
    }
  });

  // Create a new scene
  app.post("/api/scenes", async (req, res) => {
    try {
      const { storyboardId, voiceOver, visualDescription, generatedImageUrl, styleId, engine, orderIndex } = req.body;
      
      const scene = await storage.createScene({
        storyboardId: storyboardId || null,
        voiceOver: voiceOver || "",
        visualDescription: visualDescription || "",
        generatedImageUrl: generatedImageUrl || null,
        styleId: styleId || null,
        engine: engine || null,
        orderIndex,
      });
      
      res.json(scene);
    } catch (error) {
      console.error("Error creating scene:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to create scene",
      });
    }
  });

  // Update a scene
  app.patch("/api/scenes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          error: "Invalid ID",
          message: "Scene ID must be a number",
        });
      }

      const { voiceOver, visualDescription, generatedImageUrl, styleId, engine, orderIndex } = req.body;
      
      const scene = await storage.updateScene(id, {
        voiceOver,
        visualDescription,
        generatedImageUrl,
        styleId,
        engine,
        orderIndex,
      });

      if (!scene) {
        return res.status(404).json({
          error: "Not found",
          message: `Scene ${id} not found`,
        });
      }

      res.json(scene);
    } catch (error) {
      console.error("Error updating scene:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update scene",
      });
    }
  });

  // Delete a scene
  app.delete("/api/scenes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          error: "Invalid ID",
          message: "Scene ID must be a number",
        });
      }

      const deleted = await storage.deleteScene(id);
      
      if (!deleted) {
        return res.status(404).json({
          error: "Not found",
          message: `Scene ${id} not found`,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting scene:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete scene",
      });
    }
  });

  // Reorder scenes
  app.post("/api/scenes/reorder", async (req, res) => {
    try {
      const { sceneIds } = req.body;
      
      if (!Array.isArray(sceneIds)) {
        return res.status(400).json({
          error: "Invalid request",
          message: "sceneIds must be an array",
        });
      }

      await storage.reorderScenes(sceneIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering scenes:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to reorder scenes",
      });
    }
  });

  await initializeReferenceImages();

  // Migrate orphan scenes to a default storyboard
  await migrateOrphanScenes();

  // ===== Character API =====

  // Get all characters
  app.get("/api/characters", async (req, res) => {
    try {
      const chars = await storage.getAllCharacters();
      res.json(chars);
    } catch (error) {
      console.error("Error fetching characters:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch characters",
      });
    }
  });

  // Get single character
  app.get("/api/characters/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const character = await storage.getCharacter(id);
      
      if (!character) {
        return res.status(404).json({
          error: "Not found",
          message: `Character ${id} not found`,
        });
      }

      res.json(character);
    } catch (error) {
      console.error("Error fetching character:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch character",
      });
    }
  });

  // Create a new character
  app.post("/api/characters", async (req, res) => {
    try {
      const { id, name, visualPrompt, characterCards, selectedCardId, tags } = req.body;
      
      if (!id || !name) {
        return res.status(400).json({
          error: "Invalid request",
          message: "id and name are required",
        });
      }

      // Check if character ID already exists
      const existing = await storage.getCharacter(id);
      if (existing) {
        return res.status(409).json({
          error: "Conflict",
          message: "Character ID already exists",
        });
      }

      const character = await storage.createCharacter({
        id,
        name,
        visualPrompt: visualPrompt || "",
        characterCards: characterCards || [],
        selectedCardId: selectedCardId || null,
        tags: tags || [],
      });
      
      res.json(character);
    } catch (error) {
      console.error("Error creating character:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to create character",
      });
    }
  });

  // Update a character
  app.patch("/api/characters/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, visualPrompt, characterCards, selectedCardId, tags } = req.body;
      
      const character = await storage.updateCharacter(id, {
        name,
        visualPrompt,
        characterCards,
        selectedCardId,
        tags,
      });

      if (!character) {
        return res.status(404).json({
          error: "Not found",
          message: `Character ${id} not found`,
        });
      }

      res.json(character);
    } catch (error) {
      console.error("Error updating character:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update character",
      });
    }
  });

  // Generate a character card
  app.post("/api/characters/generate-card", async (req, res) => {
    try {
      const { characterId, styleId, visualPrompt } = req.body;
      
      if (!characterId || !styleId || !visualPrompt) {
        return res.status(400).json({
          error: "Invalid request",
          message: "characterId, styleId, and visualPrompt are required",
        });
      }

      // Get the character
      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({
          error: "Not found",
          message: `Character ${characterId} not found`,
        });
      }

      // Get the style
      const style = await storage.getStyle(styleId);
      if (!style) {
        return res.status(404).json({
          error: "Not found",
          message: `Style ${styleId} not found`,
        });
      }

      // Get the template for this style
      const template = await storage.getTemplate(styleId);
      
      // Build the prompt for character card generation
      let finalPrompt = "";
      
      if (template?.templateData && typeof template.templateData === "object") {
        const templateData = template.templateData as { templateType?: string; styleKeywords?: string; rules?: string; negativePrompt?: string };
        
        if (templateData.templateType === "universal") {
          // Use universal template format for character card
          finalPrompt = `CHARACTER PORTRAIT

[SUBJECT]
${visualPrompt}

[STYLE]
${templateData.styleKeywords || style.basePrompt}

[RULES]
- Full body or upper body portrait
- Clear, well-lit character design
- Clean background
- Character should be the main focus
${templateData.rules || ""}

[NEGATIVE]
${templateData.negativePrompt || "blurry, low quality, distorted"}`;
        } else {
          // Use simple format
          finalPrompt = `${visualPrompt}, ${style.basePrompt}, character portrait, full body, clean background, high quality`;
        }
      } else {
        // No template, use basic format
        finalPrompt = `${visualPrompt}, ${style.basePrompt}, character portrait, full body, clean background, high quality`;
      }

      console.log(`[CharacterCard] Generating card for ${character.name} with style ${style.label}`);
      console.log(`[CharacterCard] Prompt: ${finalPrompt.substring(0, 200)}...`);

      // Get reference images from the template
      const referenceImages = template?.referenceImages || [];
      const styleRefImage = style.referenceImageUrl;
      
      // Build image URLs array (style reference first)
      const imageUrls = styleRefImage ? [styleRefImage, ...referenceImages.slice(0, 2)] : referenceImages.slice(0, 3);
      
      // Use the first engine from the style
      const engine = style.engines[0] || "nano-banana-edit";
      
      let generatedImageUrl: string;
      
      if (engine === "seedream-v4-edit") {
        generatedImageUrl = await callSeedreamEdit(finalPrompt, imageUrls);
      } else if (engine === "nano-pro") {
        generatedImageUrl = await callNanoProEdit(finalPrompt, imageUrls);
      } else {
        generatedImageUrl = await callNanoBananaEdit(finalPrompt, imageUrls);
      }

      // Create the new character card
      const newCard = {
        id: `card_${Date.now()}`,
        styleId: styleId,
        imageUrl: generatedImageUrl,
        prompt: finalPrompt,
        createdAt: new Date().toISOString(),
      };

      // Update the character with the new card
      const existingCards = (character.characterCards || []) as Array<{id: string; styleId: string; imageUrl: string; prompt: string; createdAt: string}>;
      const updatedCharacter = await storage.updateCharacter(characterId, {
        characterCards: [...existingCards, newCard],
        selectedCardId: newCard.id,
        visualPrompt: visualPrompt,
      });

      console.log(`[CharacterCard] Successfully generated card ${newCard.id} for character ${character.name}`);
      
      res.json({
        success: true,
        card: newCard,
        character: updatedCharacter,
      });
    } catch (error) {
      console.error("Error generating character card:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Failed to generate character card",
      });
    }
  });

  // Delete a character
  app.delete("/api/characters/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCharacter(id);
      
      if (!deleted) {
        return res.status(404).json({
          error: "Not found",
          message: `Character ${id} not found`,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting character:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete character",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

async function migrateOrphanScenes() {
  try {
    // Check if there are any orphan scenes (scenes without a storyboardId)
    const allScenes = await storage.getAllScenes();
    const orphanScenes = allScenes.filter(s => s.storyboardId === null);
    
    if (orphanScenes.length === 0) {
      console.log("No orphan scenes to migrate");
      return;
    }

    console.log(`Found ${orphanScenes.length} orphan scene(s), migrating...`);

    // Check if there's already a default storyboard
    const storyboards = await storage.getAllStoryboards();
    let defaultStoryboard = storyboards.find(s => s.name === "Default Storyboard");

    if (!defaultStoryboard) {
      // Create a default storyboard
      defaultStoryboard = await storage.createStoryboard({
        name: "Default Storyboard",
        description: "Auto-created storyboard for migrated scenes",
      });
      console.log(`Created default storyboard with ID: ${defaultStoryboard.id}`);
    }

    // Migrate orphan scenes to the default storyboard
    await storage.migrateScenesToStoryboard(defaultStoryboard.id);
    console.log(`✓ Migrated ${orphanScenes.length} scene(s) to storyboard: ${defaultStoryboard.name}`);
  } catch (error) {
    console.error("Error migrating orphan scenes:", error);
  }
}

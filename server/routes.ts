import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { generateRequestSchema, generateResponseSchema, type StylePreset } from "@shared/schema";
import { storage } from "./storage";
import { uploadReferenceImages, uploadFileToKIE, uploadBufferToKIE, type StyleImageMapping } from "./services/fileUpload";
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
    engines: ["nanobanana", "seedream", "nanopro", "nanobanana-t2i", "nanopro-t2i"],
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
    engines: ["nanobanana", "seedream", "nanopro", "nanobanana-t2i", "nanopro-t2i"],
    basePrompt:
      "in the style of warm orange and red flat illustration, strong contrast on main subject, almost white background, bold colors, simplified shapes, modern flat design",
    referenceImageUrl: STYLE_REFERENCE_IMAGES.warm_orange_flat,
  },
  {
    id: "simple_cyan_test",
    label: "Simple Cyan (Test)",
    description: "Test style using simple concatenation template - same cyan vector look with minimal prompt structure",
    engines: ["nanobanana", "seedream", "nanopro", "nanobanana-t2i", "nanopro-t2i"],
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
    engines: ["nanobanana", "seedream", "nanopro", "nanobanana-t2i", "nanopro-t2i"],
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

// Simple template builder - free-form prompt testing
// Output: {userPrompt}, {template.prompt}
function buildSimplePrompt(
  userPrompt: string,
  _style: StylePreset & { basePrompt: string },
  _hasUserReference: boolean,
  template: any
): string {
  const templatePrompt = template.prompt || "";
  
  // Simple concatenation: scene + template prompt (for free testing)
  if (templatePrompt) {
    return `${userPrompt}, ${templatePrompt}`;
  }
  return userPrompt;
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

// Cinematic template builder - uses structured sections with weighted keywords
// Format is particularly effective for style-locked storyboard consistency
function buildCinematicPrompt(
  userPrompt: string,
  style: StylePreset & { basePrompt: string },
  hasUserReference: boolean,
  template: any
): string {
  const cameraFraming = template.cameraFraming || "(Medium shot:1.1), balanced composition, cinematic storyboard, eye-level angle";
  const visualAnchors = template.visualAnchors || "";
  const colorRender = template.colorRender || "";
  const technicalSpecs = template.technicalSpecs || "best quality, 2D vector art, clean lines, sharp edges";
  const negativePrompt = template.negativePrompt || "";
  
  // Character lock instruction for reference images
  const characterLock = hasUserReference 
    ? "\nMaintain exact character appearance from reference: face, hairstyle, clothing, body proportions."
    : "";
  
  // Build prompt following cinematic structure with explicit sections
  let prompt = `[SCENE ACTION]
${userPrompt}${characterLock}

[CAMERA & FRAMING]
${cameraFraming}

[VISUAL ANCHORS]
${visualAnchors}

[COLOR & RENDER]
${colorRender}

[TECHNICAL SPECS]
${technicalSpecs}

[NEGATIVE]
${negativePrompt}`;

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
  
  // Check if this is a cinematic template
  if (template.templateType === "cinematic") {
    return buildCinematicPrompt(userPrompt, style, hasUserReference, template);
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

// Nano Banana Text-to-Image (no reference images needed)
async function callNanoBananaT2I(prompt: string, imageSize: string = "16:9") {
  if (!KIE_API_KEY) {
    throw new Error("KIE_API_KEY is not set in the environment");
  }

  console.log(`[NanoBanana T2I] Creating text-to-image task...`);
  console.log(`[NanoBanana T2I] Prompt: ${prompt.substring(0, 100)}...`);
  console.log(`[NanoBanana T2I] Image Size: ${imageSize}`);

  const createResponse = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KIE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/nano-banana",
      input: {
        prompt,
        output_format: "png",
        image_size: imageSize,
      },
    }),
  });

  const createJson = await createResponse.json();

  if (!createResponse.ok || createJson.code !== 200) {
    throw new Error(`NanoBanana T2I failed to create task: ${createResponse.status} ${createJson.msg ?? ""}`);
  }

  const taskId = createJson.data?.taskId;
  if (!taskId) {
    throw new Error("NanoBanana T2I response missing taskId");
  }

  console.log(`[NanoBanana T2I] Task created: ${taskId}`);
  return await pollNanoBananaResult(taskId);
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

// Nano Pro Text-to-Image (no reference images needed) - Higher quality 2K/4K resolution
async function callNanoProT2I(prompt: string, aspectRatio: string = "16:9", resolution: string = "2K") {
  if (!KIE_API_KEY) {
    throw new Error("KIE_API_KEY is not set in the environment");
  }

  console.log(`[NanoPro T2I] Creating text-to-image task...`);
  console.log(`[NanoPro T2I] Prompt: ${prompt.substring(0, 100)}...`);
  console.log(`[NanoPro T2I] Aspect Ratio: ${aspectRatio}, Resolution: ${resolution}`);

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
        image_input: [],
        aspect_ratio: aspectRatio,
        resolution: resolution,
        output_format: "png",
      },
    }),
  });

  const createJson = await createResponse.json();

  if (!createResponse.ok || createJson.code !== 200) {
    throw new Error(`NanoPro T2I failed to create task: ${createResponse.status} ${createJson.msg ?? ""}`);
  }

  const taskId = createJson.data?.taskId;
  if (!taskId) {
    throw new Error("NanoPro T2I response missing taskId");
  }

  console.log(`[NanoPro T2I] Task created: ${taskId}`);
  return await pollNanoProResult(taskId);
}

// DEPRECATED: This function is no longer used for image generation
// Reference images are now exclusively managed through the Style Editor UI
// and stored in templateData.referenceImages (database)
// This prevents deleted images from being sent to the KIE API
// Keeping the function for potential future use (e.g., migration, cleanup tools)
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
      isHidden: false,
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
  // Query params:
  //   includeHidden=1 - Include hidden styles (for Style Editor only)
  app.get("/api/styles", async (req, res) => {
    try {
      const includeHidden = req.query.includeHidden === "1";
      
      // Get styles from database with proper ordering
      const dbStyles = await storage.getStylesWithOrder({ includeHidden });
      
      if (dbStyles.length > 0) {
        // For each style, get its template to find the first reference image
        const stylesForFrontend = await Promise.all(
          dbStyles.map(async ({ id, label, description, engines, basePrompt, defaultColors, isBuiltIn, isHidden, referenceImageUrl, displayOrder }) => {
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
            
            // Get full reference images array
            let referenceImages: string[] = [];
            if (dbTemplate?.referenceImages && dbTemplate.referenceImages.length > 0) {
              referenceImages = dbTemplate.referenceImages;
            } else {
              const defaultTemplate = getDefaultTemplate(id);
              if (defaultTemplate?.referenceImages && defaultTemplate.referenceImages.length > 0) {
                referenceImages = defaultTemplate.referenceImages;
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
              isHidden,
              displayOrder,
              referenceImageUrl: thumbnailUrl,
              referenceImages,
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
          let referenceImages: string[] = [];
          if (defaultTemplate?.referenceImages && defaultTemplate.referenceImages.length > 0) {
            thumbnailUrl = defaultTemplate.referenceImages[0];
            referenceImages = defaultTemplate.referenceImages;
          }
          
          return {
            id,
            label,
            description,
            engines,
            basePrompt,
            defaultColors,
            isBuiltIn: true,
            isHidden: false,
            displayOrder: 9999,
            referenceImageUrl: thumbnailUrl,
            referenceImages,
          };
        })
      );
      res.json(stylesForFrontend);
    } catch (error) {
      console.error("Error fetching styles:", error);
      // Fallback to static styles on error
      const stylesForFrontend = STYLE_PRESETS.map(({ id, label, description, engines, basePrompt, defaultColors, referenceImageUrl }) => {
        const defaultTemplate = getDefaultTemplate(id);
        const referenceImages = defaultTemplate?.referenceImages || [];
        return {
          id,
          label,
          description,
          engines,
          basePrompt,
          defaultColors,
          isBuiltIn: true,
          isHidden: false,
          displayOrder: 9999,
          referenceImageUrl,
          referenceImages,
        };
      });
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
        isHidden: false,
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
        isHidden: false,
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

  // PATCH /api/styles/:id - Update a style (visibility, label, etc.)
  app.patch("/api/styles/:id", async (req, res) => {
    try {
      const styleId = req.params.id;
      const { isHidden, label, description } = req.body;
      
      const style = await storage.getStyle(styleId);
      if (!style) {
        return res.status(404).json({ error: "Style not found" });
      }
      
      const updateData: Partial<{isHidden: boolean; label: string; description: string}> = {};
      if (typeof isHidden === "boolean") {
        updateData.isHidden = isHidden;
      }
      if (typeof label === "string" && label.trim()) {
        updateData.label = label.trim();
      }
      if (typeof description === "string") {
        updateData.description = description;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      
      const updatedStyle = await storage.updateStyle(styleId, updateData);
      res.json(updatedStyle);
    } catch (error) {
      console.error("Error updating style:", error);
      res.status(500).json({ error: "Failed to update style" });
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

      const { prompt, styleId, engine, userReferenceImages, customTemplate, templateReferenceImages, sceneId, isEditMode } = validationResult.data;
      
      // Parse character placeholders from prompt (format: [角色名] or [CharacterName])
      // Only process placeholders that match known character names (with normalization)
      // This automatically adds character cards as reference images and enriches the prompt
      let processedPrompt = prompt;
      const characterReferenceImages: string[] = [];
      
      // First, get all characters to build a lookup map (case-insensitive, trimmed)
      const allCharacters = await storage.getAllCharacters();
      const characterLookup = new Map<string, typeof allCharacters[0]>();
      for (const c of allCharacters) {
        characterLookup.set(c.name.toLowerCase().trim(), c);
      }
      
      // Find all bracket expressions in the prompt using global regex
      const characterPlaceholderRegex = /\[([^\]]+)\]/g;
      let match;
      const processedPlaceholders = new Set<string>(); // Track already processed to avoid duplicates
      
      while ((match = characterPlaceholderRegex.exec(prompt)) !== null) {
        const fullPlaceholder = match[0]; // e.g., "[Alice]"
        const rawName = match[1]; // e.g., "Alice" or " Alice "
        const normalizedName = rawName.toLowerCase().trim();
        
        // Skip if already processed this exact placeholder
        if (processedPlaceholders.has(fullPlaceholder)) continue;
        
        // Only process if this matches a known character name (case-insensitive, trimmed)
        const character = characterLookup.get(normalizedName);
        if (!character) {
          // Not a known character - leave this bracket expression untouched
          continue;
        }
        
        console.log(`\n=== Character Placeholder Detection ===`);
        console.log(`✓ Found character: ${character.name} (from placeholder "${fullPlaceholder}")`);
        
        // Find character card matching the current style
        const characterCards = character.characterCards as { id: string; styleId: string; imageUrl: string; prompt: string; createdAt: string }[] || [];
        const styleCard = characterCards.find(card => card.styleId === styleId);
        
        let usedCard: { id: string; styleId: string; imageUrl: string } | null = null;
        
        if (styleCard) {
          console.log(`  → Using style-matched card: ${styleCard.id}`);
          usedCard = styleCard;
        } else {
          // No matching style card, use selected card if available
          const selectedCard = characterCards.find(card => card.id === character.selectedCardId);
          if (selectedCard) {
            console.log(`  → Using selected card (different style): ${selectedCard.id}`);
            usedCard = selectedCard;
          }
        }
        
        if (usedCard) {
          characterReferenceImages.push(usedCard.imageUrl);
          
          // Replace ALL occurrences of this placeholder with character's visual description
          if (character.visualPrompt) {
            const escapedPlaceholder = fullPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            processedPrompt = processedPrompt.replace(new RegExp(escapedPlaceholder, 'g'), character.visualPrompt);
            console.log(`  → Replaced all occurrences of placeholder with visual prompt`);
          }
        } else {
          console.log(`  → No usable card for style ${styleId}, keeping placeholder as-is`);
        }
        
        processedPlaceholders.add(fullPlaceholder);
        console.log(`=== End Character Placeholder Detection ===\n`);
      }
      
      if (characterReferenceImages.length > 0) {
        console.log(`Total character reference images: ${characterReferenceImages.length}`);
      }
      
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
      const hasCharacterReference = characterReferenceImages.length > 0;
      
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
      // Note: we use processedPrompt (with character placeholders replaced) instead of raw prompt
      const hasReference = hasUserReference || hasCharacterReference;
      const finalPrompt = buildPrompt(processedPrompt, selectedStyle, hasReference, templateToUse);

      // Build image URLs array with priority order:
      // 1. Character card reference images (from placeholder parsing, highest priority)
      // 2. User-selected reference images
      // 3. Template reference images (from Prompt Editor)
      // 4. Style preset reference images (uploaded from public/reference-images)
      const imageUrls: string[] = [];
      
      // Add character reference images first (highest priority for character consistency)
      if (characterReferenceImages.length > 0) {
        imageUrls.push(...characterReferenceImages);
        console.log(`Added ${characterReferenceImages.length} character reference image(s)`);
      }
      
      if (userReferenceImages && userReferenceImages.length > 0) {
        imageUrls.push(...userReferenceImages);
      }
      
      // In edit mode, skip template and style reference images - only use the image being edited
      if (!isEditMode) {
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
        
        // Note: We no longer scan the filesystem for reference images
        // All reference images are now managed explicitly through the Style Editor UI
        // and stored in templateData.referenceImages (database)
        // This ensures that deleted images are not sent to the API
      } else {
        console.log(`Edit mode: Skipping template and style reference images, using only user reference image`);
      }

      console.log("\n=== Image Generation Request ===");
      console.log(`Engine: ${engine}`);
      console.log(`Style: ${selectedStyle.label} (${styleId})`);
      console.log(`Edit Mode: ${isEditMode ? "Yes (skipping style references)" : "No"}`);
      console.log(`User Prompt: ${prompt}`);
      console.log(`Processed Prompt: ${processedPrompt !== prompt ? processedPrompt : "(same as user prompt)"}`);
      console.log(`Character Reference Images: ${characterReferenceImages.join(", ") || "None"}`);
      console.log(`User Reference Images: ${userReferenceImages?.join(", ") || "None"}`);
      console.log(`Template Reference Images: ${isEditMode ? "(skipped - edit mode)" : (templateReferenceImages?.join(", ") || "None")}`);
      console.log(`Image URLs (priority order): ${imageUrls.join(", ")}`);
      console.log(`Final Prompt: ${finalPrompt}`);
      console.log("================================\n");

      // Route to appropriate engine
      let imageUrl: string;
      if (engine === "nanobanana") {
        imageUrl = await callNanoBananaEdit(finalPrompt, imageUrls);
      } else if (engine === "nanopro") {
        imageUrl = await callNanoProEdit(finalPrompt, imageUrls);
      } else if (engine === "nanobanana-t2i") {
        // Text-to-Image engine - no reference images needed
        imageUrl = await callNanoBananaT2I(finalPrompt, "16:9");
      } else if (engine === "nanopro-t2i") {
        // Nano Pro Text-to-Image engine - high quality 2K resolution, no reference images needed
        imageUrl = await callNanoProT2I(finalPrompt, "16:9", "2K");
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

  // Template reorder must come before :styleId routes to avoid matching "reorder" as a styleId
  app.post("/api/templates/reorder", async (req, res) => {
    try {
      const { templateOrders } = req.body;
      
      if (!templateOrders || !Array.isArray(templateOrders)) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "templateOrders array is required",
        });
      }

      await storage.reorderTemplates(templateOrders);
      
      res.json({
        message: "Templates reordered successfully",
      });
    } catch (error) {
      console.error("Error reordering templates:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to reorder templates",
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

      // Validate styleId exists (check presets, styles table, or templates)
      const presetExists = STYLE_PRESETS.some((s) => s.id === styleId);
      const dbStyle = await storage.getStyle(styleId);
      const dbTemplate = await storage.getTemplate(styleId);
      if (!presetExists && !dbStyle && !dbTemplate) {
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

  app.post("/api/upload-region", async (req, res) => {
    try {
      const busboy = (await import("busboy")).default;
      const bb = busboy({ headers: req.headers });
      
      let fileBuffer: Buffer | null = null;
      let fileName = `region-${Date.now()}.png`;
      
      bb.on("file", (name, file, info) => {
        const chunks: Buffer[] = [];
        if (info.filename) {
          fileName = info.filename;
        }
        file.on("data", (data) => {
          chunks.push(data);
        });
        file.on("end", () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });
      
      bb.on("finish", async () => {
        if (!fileBuffer) {
          return res.status(400).json({ error: "No file found in request" });
        }
        
        try {
          const uploaded = await uploadBufferToKIE(fileBuffer, fileName, "cropped-regions");
          
          res.json({
            success: true,
            url: uploaded.fileUrl,
            fileName: uploaded.fileName,
          });
        } catch (uploadError) {
          console.error("Error uploading to KIE:", uploadError);
          res.status(500).json({
            error: "Internal server error",
            message: "Failed to upload cropped region to KIE",
          });
        }
      });
      
      bb.on("error", (error) => {
        console.error("Busboy error:", error);
        res.status(500).json({
          error: "Internal server error",
          message: "Failed to parse upload",
        });
      });
      
      req.pipe(bb);
    } catch (error) {
      console.error("Error uploading region:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to upload cropped region",
      });
    }
  });

  app.delete("/api/delete-reference-image", async (req, res) => {
    try {
      const { styleId, imagePath } = req.body;

      if (!styleId || !imagePath) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "styleId and imagePath are required",
        });
      }

      // Validate that imagePath belongs to this styleId to prevent cross-style deletion
      const expectedPathPrefix = `/reference-images/${styleId}/`;
      const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      
      if (!normalizedPath.startsWith(expectedPathPrefix) && !normalizedPath.includes(`/reference-images/${styleId}/`)) {
        return res.status(400).json({
          error: "Path mismatch",
          message: `imagePath does not belong to style '${styleId}'`,
        });
      }

      // Extract filename from the path (e.g., "/reference-images/warm/A.png" -> "A.png")
      const fileName = imagePath.split('/').pop();
      if (!fileName) {
        return res.status(400).json({
          error: "Invalid imagePath",
          message: "Could not extract filename from imagePath",
        });
      }

      // Build the full file path
      const { unlinkSync, existsSync: fsExistsSync } = await import("fs");
      const styleDir = join(__dirname, "..", "client", "public", "reference-images", styleId);
      const filePath = join(styleDir, fileName);

      // Check if file exists
      if (!fsExistsSync(filePath)) {
        console.log(`Reference image not found (may already be deleted): ${filePath}`);
        return res.json({
          success: true,
          message: "File not found (may already be deleted)",
          deletedPath: imagePath,
        });
      }

      // Delete the file
      unlinkSync(filePath);
      console.log(`✓ Deleted reference image: ${styleId}/${fileName}`);

      // Remove from uploadCache to ensure it's re-uploaded if added again
      const cacheKey = `${styleId}:${imagePath}`;
      uploadCache.delete(cacheKey);

      // Remove from uploadedReferenceImages cache
      const existingStyle = uploadedReferenceImages.find((s) => s.styleId === styleId);
      if (existingStyle) {
        existingStyle.imageUrls = existingStyle.imageUrls.filter(
          (url) => !url.includes(fileName)
        );
      }

      res.json({
        success: true,
        message: "Reference image deleted successfully",
        deletedPath: imagePath,
      });
    } catch (error) {
      console.error("Error deleting reference image:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete reference image",
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

      const { name, description, styleId, engine, setupCompleted } = req.body;
      
      const storyboard = await storage.updateStoryboard(id, {
        name,
        description,
        styleId,
        engine,
        setupCompleted,
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

      const { voiceOver, visualDescription, generatedImageUrl, styleId, engine, orderIndex, selectedCharacterIds } = req.body;
      
      const scene = await storage.updateScene(id, {
        voiceOver,
        visualDescription,
        generatedImageUrl,
        styleId,
        engine,
        orderIndex,
        selectedCharacterIds,
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
      const { id, name, visualPrompt, characterCards, selectedCardId, avatarCardId, avatarProfiles, tags } = req.body;
      
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
        avatarCardId: avatarCardId || null,
        avatarProfiles: avatarProfiles || {},
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
      const { name, visualPrompt, characterCards, selectedCardId, avatarCardId, avatarProfiles, tags } = req.body;
      
      const character = await storage.updateCharacter(id, {
        name,
        visualPrompt,
        characterCards,
        selectedCardId,
        avatarCardId,
        avatarProfiles,
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
      const { characterId, styleId, visualPrompt, angle = "front", pose = "standing", expression = "neutral", isCharacterSheet = false, cleanBackground = true } = req.body;
      
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
      
      // Map angle/pose/expression to descriptive text
      const angleDescriptions: Record<string, string> = {
        "front": "front view, facing camera directly",
        "three-quarter": "three-quarter view, slight angle",
        "side": "side view profile, looking left or right",
        "back": "back view, facing away from camera",
      };
      
      const poseDescriptions: Record<string, string> = {
        "standing": "standing pose, natural posture",
        "sitting": "sitting pose, relaxed position",
        "walking": "walking pose, mid-stride movement",
        "action": "dynamic action pose, expressive movement",
        "portrait": "upper body portrait, shoulders and head",
      };
      
      const expressionDescriptions: Record<string, string> = {
        "neutral": "neutral expression, calm and composed",
        "happy": "happy expression, smiling warmly",
        "sad": "sad expression, melancholic look",
        "angry": "angry expression, intense gaze",
        "surprised": "surprised expression, wide eyes",
        "thoughtful": "thoughtful expression, contemplative look",
      };
      
      const angleText = angleDescriptions[angle] || angleDescriptions["front"];
      const poseText = poseDescriptions[pose] || poseDescriptions["standing"];
      const expressionText = expressionDescriptions[expression] || expressionDescriptions["neutral"];
      
      // Build background instruction based on cleanBackground flag
      const backgroundInstruction = cleanBackground 
        ? "solid white background, no environment, no scenery, studio lighting, character isolated"
        : "simple contextual background, well-lit";
      
      // Build framing instruction based on mode (character sheet vs single card)
      // NEW: Added proportion control rules for consistent character scaling
      let framingInstruction: string;
      if (isCharacterSheet) {
        // Character sheet mode: multiple angles with UNIFIED SCALE rules
        framingInstruction = `Character turnaround reference sheet, arranged horizontally:
- Front view (facing forward)
- Three-quarter right view (turned slightly to the right)
- Right side view (full profile facing right)
- Back view (facing away, symmetric)

All views must follow identical scale:
- Same canvas height per view
- Heads aligned at identical top margin
- Feet aligned to the same baseline at bottom
- Head size and body proportions remain constant across all views
- No resizing or perspective variation between views
- Neutral expression in all angles
- ${backgroundInstruction}`;
      } else {
        // Single card mode: specific angle, pose, and expression
        // NEW: Added proportion control (88% canvas height, baseline alignment)
        framingInstruction = `${angleText}, ${poseText}, ${expressionText}.
Full-body character centered in frame.
Character height should occupy approximately 85-90% of canvas height.
Feet aligned to a consistent baseline at the bottom of the frame.
Head kept within a consistent top margin.
No perspective distortion. No resizing of body proportions.
${backgroundInstruction}`;
      }
      
      // Build the prompt using Universal template structure (same as main image generation)
      let finalPrompt = "";
      
      if (template?.templateData && typeof template.templateData === "object") {
        const templateData = template.templateData as { 
          templateType?: string; 
          styleKeywords?: string; 
          rules?: string; 
          negativePrompt?: string;
          loosePalette?: string;
          strictPalette?: string[];
          defaultPalette?: string[];
          paletteMode?: string;
        };
        
        const styleName = style.label;
        const styleKeywords = templateData.styleKeywords || style.basePrompt || "";
        const rules = templateData.rules || "";
        
        // Build negative prompt with proportion-related negatives
        // Keep the critical "multiple characters" guard for single-card mode
        let negativePrompt = templateData.negativePrompt || "blurry, low quality, distorted, multiple characters, group shot";
        
        // Add proportion control negatives (prevent head/body ratio issues)
        negativePrompt += ", oversized head, chibi proportions, extreme perspective, foreshortening, distorted limbs, inconsistent proportions";
        
        // Add background-related negatives when clean background is requested
        if (cleanBackground) {
          negativePrompt += ", complex background, environmental elements, scenery, gradient background, outdoor scene, indoor scene, landscape";
        }
        
        // Add character sheet specific negatives
        if (isCharacterSheet) {
          negativePrompt += ", different sizes between views, inconsistent character height, misaligned baseline";
        }
        
        // Build prompt following Universal structure: [SCENE][FRAMING][STYLE][COLORS][RULES][NEGATIVE]
        finalPrompt = `[SCENE]
${visualPrompt}

[FRAMING]
${framingInstruction}

[STYLE]
In ${styleName} style:
${styleKeywords}`;

        // Add color palette section (same logic as buildUniversalPrompt)
        // Determine palette mode: default to "loose" for better results
        const paletteMode = templateData.paletteMode || "loose";
        
        // Loose mode: Use descriptive color text (if available)
        if (paletteMode === "loose" && templateData.loosePalette) {
          finalPrompt += `

[COLORS]
${templateData.loosePalette}`;
        } else {
          // Strict mode or fallback: Use HEX palette
          // This matches buildUniversalPrompt's fallback chain
          let palette: string[] = [];
          if (templateData.strictPalette && templateData.strictPalette.length > 0) {
            palette = templateData.strictPalette;
          } else if (templateData.defaultPalette && templateData.defaultPalette.length > 0) {
            // Legacy support: use defaultPalette if strictPalette not defined
            palette = templateData.defaultPalette;
          } else if (style.defaultColors && (style.defaultColors as any).colors) {
            // Fallback to style's default colors
            palette = ((style.defaultColors as any).colors as any[]).map((c: any) => c.hex);
          }
          
          if (palette.length > 0) {
            const paletteColors = palette.join(", ");
            finalPrompt += `

[COLORS]
Use the following palette:
${paletteColors}.
Follow the palette's saturation and contrast.`;
          }
        }
        
        // Add rules section with character-specific additions and proportion control
        // NEW: Added fixed scale rules for consistent character proportions
        let proportionRules = `- Single character only (unless generating character sheet)
- Character must be fully visible (no cropping)
- Maintain fixed scale across all generated character cards
- Do NOT change head size, limb proportions, or overall height
- Feet must stay aligned to baseline at bottom of frame
- No perspective distortion or exaggerated proportions`;

        // Add character sheet specific rules
        if (isCharacterSheet) {
          proportionRules += `
- All views must have identical character height
- Consistent head-to-body ratio across all angles
- Same baseline alignment in every view`;
        }

        finalPrompt += `

[RULES]
${proportionRules}
${rules}

[NEGATIVE]
${negativePrompt}`;
        
      } else {
        // No template available, use basic format with angle/pose
        finalPrompt = `${visualPrompt}, ${style.basePrompt}, ${framingInstruction}, high quality, detailed`;
      }

      console.log(`[CharacterCard] Generating ${isCharacterSheet ? 'character sheet' : 'card'} for ${character.name} with style ${style.label}`);
      console.log(`[CharacterCard] Mode: ${isCharacterSheet ? 'Character Sheet' : 'Single Card'}, Angle: ${angle}, Pose: ${pose}, Expression: ${expression}, CleanBG: ${cleanBackground}`);
      console.log(`[CharacterCard] Prompt: ${finalPrompt.substring(0, 300)}...`);

      // Get reference images from the template's referenceImages column (not templateData)
      const templateReferenceImages = template?.referenceImages || [];
      console.log(`[CharacterCard] Template reference images: ${templateReferenceImages.join(", ") || "None"}`);
      
      // Build image URLs array by uploading local paths to get HTTP URLs
      const imageUrls: string[] = [];
      
      // Upload template reference images (these are typically local paths like "/reference-images/...")
      if (templateReferenceImages.length > 0) {
        console.log(`[CharacterCard] Uploading ${templateReferenceImages.length} template reference images...`);
        const uploadPromises = templateReferenceImages.slice(0, 3).map(async (path) => {
          try {
            return await uploadImageOnDemand(path, styleId);
          } catch (error) {
            console.error(`[CharacterCard] Failed to upload template image ${path}:`, error);
            return null;
          }
        });
        
        const uploadedUrls = await Promise.all(uploadPromises);
        const validUrls = uploadedUrls.filter((url): url is string => url !== null);
        imageUrls.push(...validUrls);
      }
      
      // If no template images, try to use style's reference image as fallback
      // But only if it's a local path (not an external URL that might expire)
      if (imageUrls.length === 0 && style.referenceImageUrl) {
        const styleRefImage = style.referenceImageUrl;
        // Only use local paths, skip external URLs that might expire
        if (styleRefImage.startsWith('/reference-images/') || styleRefImage.startsWith('reference-images/')) {
          try {
            const uploadedUrl = await uploadImageOnDemand(styleRefImage, styleId);
            imageUrls.push(uploadedUrl);
            console.log(`[CharacterCard] Using style reference image: ${uploadedUrl}`);
          } catch (error) {
            console.error(`[CharacterCard] Failed to upload style reference image:`, error);
          }
        } else if (styleRefImage.startsWith('https://')) {
          // External URL - use directly but log a warning
          console.log(`[CharacterCard] Using external style reference URL: ${styleRefImage}`);
          imageUrls.push(styleRefImage);
        }
      }
      
      console.log(`[CharacterCard] Final image URLs: ${imageUrls.join(", ") || "None"}`);
      
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

      // Create the new character card with angle/pose metadata
      const newCard = {
        id: `card_${Date.now()}`,
        styleId: styleId,
        imageUrl: generatedImageUrl,
        prompt: finalPrompt,
        angle: isCharacterSheet ? "sheet" : angle,
        pose: isCharacterSheet ? "sheet" : pose,
        expression: isCharacterSheet ? "neutral" : expression,
        isCharacterSheet: isCharacterSheet,
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
      
      // Return debug info for KIE API Request Details display
      res.json({
        success: true,
        card: newCard,
        character: updatedCharacter,
        // Debug info for prompt fine-tuning
        debugInfo: {
          engine: engine,
          styleLabel: style.label,
          referenceImageUrls: imageUrls,
          finalPrompt: finalPrompt,
          generatedImageUrl: generatedImageUrl,
          visualPrompt: visualPrompt,
          angle: isCharacterSheet ? "sheet" : angle,
          pose: isCharacterSheet ? "sheet" : pose,
          expression: isCharacterSheet ? "neutral" : expression,
          isCharacterSheet: isCharacterSheet,
          cleanBackground: cleanBackground,
        },
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

  // ===== Asset API Routes (backgrounds, props) =====

  // Get all assets (optionally filter by type)
  app.get("/api/assets", async (req, res) => {
    try {
      const type = req.query.type as "background" | "prop" | undefined;
      const assetList = await storage.getAllAssets(type);
      res.json(assetList);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch assets",
      });
    }
  });

  // Get single asset by ID
  app.get("/api/assets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const asset = await storage.getAsset(id);
      
      if (!asset) {
        return res.status(404).json({
          error: "Not found",
          message: `Asset ${id} not found`,
        });
      }

      res.json(asset);
    } catch (error) {
      console.error("Error fetching asset:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch asset",
      });
    }
  });

  // Create a new asset
  app.post("/api/assets", async (req, res) => {
    try {
      const { id, type, name, visualPrompt, referenceImages, tags } = req.body;
      
      if (!id || !type || !name) {
        return res.status(400).json({
          error: "Validation error",
          message: "id, type, and name are required",
        });
      }

      if (type !== "background" && type !== "prop") {
        return res.status(400).json({
          error: "Validation error",
          message: "type must be 'background' or 'prop'",
        });
      }

      const asset = await storage.createAsset({
        id,
        type,
        name,
        visualPrompt: visualPrompt || "",
        referenceImages: referenceImages || [],
        tags: tags || [],
      });

      res.status(201).json(asset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Failed to create asset",
      });
    }
  });

  // Update an asset
  app.patch("/api/assets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, visualPrompt, referenceImages, tags } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (visualPrompt !== undefined) updateData.visualPrompt = visualPrompt;
      if (referenceImages !== undefined) updateData.referenceImages = referenceImages;
      if (tags !== undefined) updateData.tags = tags;

      const updated = await storage.updateAsset(id, updateData);
      
      if (!updated) {
        return res.status(404).json({
          error: "Not found",
          message: `Asset ${id} not found`,
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating asset:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update asset",
      });
    }
  });

  // Delete an asset
  app.delete("/api/assets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAsset(id);
      
      if (!deleted) {
        return res.status(404).json({
          error: "Not found",
          message: `Asset ${id} not found`,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete asset",
      });
    }
  });

  // ===== Node Workflow API Routes =====

  // Get all node workflows
  app.get("/api/node-workflows", async (req, res) => {
    try {
      const workflows = await storage.getAllNodeWorkflows();
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching node workflows:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch node workflows",
      });
    }
  });

  // Get single node workflow by ID
  app.get("/api/node-workflows/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid workflow ID",
        });
      }

      const workflow = await storage.getNodeWorkflow(id);
      
      if (!workflow) {
        return res.status(404).json({
          error: "Not found",
          message: `Node workflow ${id} not found`,
        });
      }

      res.json(workflow);
    } catch (error) {
      console.error("Error fetching node workflow:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch node workflow",
      });
    }
  });

  // Create a new node workflow
  app.post("/api/node-workflows", async (req, res) => {
    try {
      const { name, description, nodes, edges } = req.body;
      
      if (!name) {
        return res.status(400).json({
          error: "Validation error",
          message: "name is required",
        });
      }

      const workflow = await storage.createNodeWorkflow({
        name,
        description: description || "",
        nodes: nodes || [],
        edges: edges || [],
      });

      res.status(201).json(workflow);
    } catch (error) {
      console.error("Error creating node workflow:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Failed to create node workflow",
      });
    }
  });

  // Update a node workflow
  app.patch("/api/node-workflows/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid workflow ID",
        });
      }

      const { name, description, nodes, edges } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (nodes !== undefined) updateData.nodes = nodes;
      if (edges !== undefined) updateData.edges = edges;

      const updated = await storage.updateNodeWorkflow(id, updateData);
      
      if (!updated) {
        return res.status(404).json({
          error: "Not found",
          message: `Node workflow ${id} not found`,
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating node workflow:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update node workflow",
      });
    }
  });

  // Delete a node workflow
  app.delete("/api/node-workflows/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid workflow ID",
        });
      }

      const deleted = await storage.deleteNodeWorkflow(id);
      
      if (!deleted) {
        return res.status(404).json({
          error: "Not found",
          message: `Node workflow ${id} not found`,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting node workflow:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete node workflow",
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

import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { generateRequestSchema, generateResponseSchema, type StylePreset } from "@shared/schema";
import { storage } from "./storage";
import { uploadReferenceImages, uploadFileToKIE, type StyleImageMapping } from "./services/fileUpload";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { readdirSync, existsSync, statSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define style presets with detailed visual descriptions
const DEFAULT_REFERENCE_IMAGE = "https://file.aiquickdraw.com/custom-page/akr/section-images/1756223420389w8xa2jfe.png";

let uploadedReferenceImages: StyleImageMapping[] = [];

const STYLE_PRESETS: Array<
  StylePreset & { basePrompt: string; referenceImageUrl: string }
> = [
  {
    id: "cyan_sketchline_vector",
    label: "Cyan Sketchline Vector",
    description:
      "Hand-drawn navy outlines on bright white space with subtle cyan-to-blue gradients, financial illustration vibe, clean modern linework",
    engines: ["nanobanana", "seedream"],
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
    referenceImageUrl: DEFAULT_REFERENCE_IMAGE,
  },
  {
    id: "warm_orange_flat",
    label: "Warm Orange Flat Illustration",
    description: "Warm orange/red flat illustration with strong contrast and almost white background",
    engines: ["nanobanana", "seedream"],
    basePrompt:
      "in the style of warm orange and red flat illustration, strong contrast on main subject, almost white background, bold colors, simplified shapes, modern flat design",
    referenceImageUrl: DEFAULT_REFERENCE_IMAGE,
  },
  {
    id: "photorealistic",
    label: "Photorealistic",
    description: "Hyper-realistic photography style with natural lighting and fine details",
    engines: ["nanobanana", "seedream"],
    basePrompt:
      "photorealistic, highly detailed, natural lighting, professional photography, sharp focus, high resolution, 8k quality, realistic textures",
    referenceImageUrl: DEFAULT_REFERENCE_IMAGE,
  },
  {
    id: "watercolor_painting",
    label: "Watercolor Painting",
    description: "Soft watercolor art with flowing colors and artistic brush strokes",
    engines: ["nanobanana", "seedream"],
    basePrompt:
      "watercolor painting style, soft edges, flowing colors, artistic brush strokes, paper texture, delicate washes, traditional art medium",
    referenceImageUrl: DEFAULT_REFERENCE_IMAGE,
  },
  {
    id: "pixel_art",
    label: "Pixel Art",
    description: "Retro 8-bit or 16-bit pixel art style with vibrant colors",
    engines: ["nanobanana", "seedream"],
    basePrompt:
      "pixel art style, 16-bit graphics, retro gaming aesthetic, vibrant colors, sharp pixels, nostalgic feel, limited color palette",
    referenceImageUrl: DEFAULT_REFERENCE_IMAGE,
  },
  {
    id: "anime_style",
    label: "Anime Style",
    description: "Japanese anime art with bold lines, expressive characters, and vibrant colors",
    engines: ["nanobanana", "seedream"],
    basePrompt:
      "anime art style, manga inspired, bold clean lines, expressive eyes, vibrant colors, cel shading, Japanese animation aesthetic",
    referenceImageUrl: DEFAULT_REFERENCE_IMAGE,
  },
  {
    id: "oil_painting",
    label: "Oil Painting",
    description: "Classic oil painting with rich textures and brushwork like the old masters",
    engines: ["nanobanana", "seedream"],
    basePrompt:
      "oil painting style, thick brush strokes, rich textures, canvas texture visible, classical art, impressionist techniques, museum quality",
    referenceImageUrl: DEFAULT_REFERENCE_IMAGE,
  },
  {
    id: "minimalist_abstract",
    label: "Minimalist Abstract",
    description: "Simple geometric shapes with minimal colors and clean composition",
    engines: ["nanobanana", "seedream"],
    basePrompt:
      "minimalist abstract art, geometric shapes, limited color palette, clean composition, negative space, modern art, simple forms",
    referenceImageUrl: DEFAULT_REFERENCE_IMAGE,
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

function buildPromptFromTemplate(
  userPrompt: string,
  style: StylePreset & { basePrompt: string },
  hasUserReference: boolean,
  template: any
) {
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
    if (template.colorMode === "custom" && template.customColors?.colors && template.customColors.colors.length > 0) {
      // Custom color palette - structured format with hex codes
      prompt += "- COLOR PALETTE (STRICT):\n";
      const totalColors = template.customColors.colors.length;
      const percentages = [60, 30, 10]; // Default percentages for first 3 colors
      template.customColors.colors.forEach((color: any, index: number) => {
        const percentage = index < 3 ? percentages[index] : Math.floor(100 / totalColors);
        const role = color.role ? ` for ${color.role}` : '';
        prompt += `  • ${color.hex.toUpperCase()} (${color.name}) - ${percentage}%${role}\n`;
      });
      prompt += "  • Use ONLY these colors, no other colors allowed\n";
    } else if (style.defaultColors?.colors) {
      // Style default colors - structured format
      prompt += "- COLOR PALETTE (STRICT):\n";
      const totalColors = style.defaultColors.colors.length;
      const percentages = [60, 30, 10];
      style.defaultColors.colors.forEach((color: any, index: number) => {
        const percentage = index < 3 ? percentages[index] : Math.floor(100 / totalColors);
        const role = color.role ? ` for ${color.role}` : '';
        prompt += `  • ${color.hex.toUpperCase()} (${color.name}) - ${percentage}%${role}\n`;
      });
      prompt += "  • Use ONLY these colors, no other colors allowed\n";
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

export async function registerRoutes(app: Express): Promise<Server> {
  // GET /api/styles - Return available style presets
  // This endpoint provides the list of style options for the frontend dropdown
  app.get("/api/styles", (req, res) => {
    // Only return the fields needed for the frontend (exclude basePrompt)
    const stylesForFrontend = STYLE_PRESETS.map(({ id, label, description, engines }) => ({
      id,
      label,
      description,
      engines,
    }));

    res.json(stylesForFrontend);
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

      const { prompt, styleId, engine, userReferenceImages, customTemplate, templateReferenceImages } = validationResult.data;
      const selectedStyle = STYLE_PRESETS.find((style) => style.id === styleId);

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
      
      // Use customTemplate if provided, otherwise use default
      const finalPrompt = buildPrompt(prompt, selectedStyle, hasUserReference, customTemplate);

      // Build image URLs array with priority order:
      // 1. User-selected reference images (highest priority)
      // 2. Template reference images (from Prompt Editor)
      // 3. Style preset reference images (uploaded from public/reference-images)
      const imageUrls: string[] = [];
      
      if (userReferenceImages && userReferenceImages.length > 0) {
        imageUrls.push(...userReferenceImages);
      }
      
      // Add template reference images if exists (upload on-demand)
      if (templateReferenceImages && templateReferenceImages.length > 0) {
        console.log(`Uploading ${templateReferenceImages.length} template reference images on-demand...`);
        const uploadPromises = templateReferenceImages.map(async (path) => {
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

      const imageUrl =
        engine === "nanobanana"
          ? await callNanoBananaEdit(finalPrompt, imageUrls)
          : await callSeedreamEdit(finalPrompt, imageUrls);

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
          generatedImageUrl: imageUrl,
        });
        historyId = savedHistory.id;
        console.log(`✓ Saved to history with ID: ${historyId}`);
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

  app.post("/api/upload-reference-image", async (req, res) => {
    try {
      const { styleId, imageBase64, fileName } = req.body;

      if (!styleId || !imageBase64 || !fileName) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "styleId, imageBase64, and fileName are required",
        });
      }

      // Validate styleId exists
      const styleExists = STYLE_PRESETS.some((s) => s.id === styleId);
      if (!styleExists) {
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

  await initializeReferenceImages();

  const httpServer = createServer(app);

  return httpServer;
}

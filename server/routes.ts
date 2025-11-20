import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { generateRequestSchema, generateResponseSchema, type StylePreset } from "@shared/schema";
import { storage } from "./storage";
import { uploadReferenceImages, type StyleImageMapping } from "./services/fileUpload";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

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
      "clean sketch-style vector line art, navy blue outlines, white negative space, subtle cyan to blue gradients for fills, minimalist details, modern financial illustration tone",
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

function buildPrompt(userPrompt: string, style: StylePreset & { basePrompt: string }, hasUserReference: boolean = false) {
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
  const maxAttempts = 10;
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
    if (state === "waiting" || state === "queuing" || state === "generating") {
      continue;
    }

    if (state === "fail") {
      throw new Error(resultJson.data?.failMsg || "NanoBanana task failed");
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
      return url;
    }
  }

  throw new Error("NanoBanana task timed out");
}

async function callSeedream(prompt: string) {
  throw new Error(`Seedream integration missing for prompt: ${prompt}`);
}

function getReferenceImageUrl(styleId: string): string {
  const uploadedStyle = uploadedReferenceImages.find((s) => s.styleId === styleId);
  if (uploadedStyle && uploadedStyle.imageUrls.length > 0) {
    return uploadedStyle.imageUrls[0];
  }
  return DEFAULT_REFERENCE_IMAGE;
}

function getAllReferenceImageUrls(styleId: string): string[] {
  const uploadedStyle = uploadedReferenceImages.find((s) => s.styleId === styleId);
  if (uploadedStyle && uploadedStyle.imageUrls.length > 0) {
    return uploadedStyle.imageUrls;
  }
  return [DEFAULT_REFERENCE_IMAGE];
}

async function initializeReferenceImages() {
  try {
    const referenceImagesPath = join(__dirname, "..", "client", "public", "reference-images");
    console.log("\n=== Uploading Reference Images ===");
    console.log(`Scanning directory: ${referenceImagesPath}`);
    
    uploadedReferenceImages = await uploadReferenceImages(referenceImagesPath);
    
    console.log(`✓ Successfully uploaded ${uploadedReferenceImages.length} style categories`);
    for (const style of uploadedReferenceImages) {
      console.log(`  - ${style.styleId}: ${style.imageUrls.length} images`);
      for (const preset of STYLE_PRESETS) {
        if (preset.id === style.styleId) {
          preset.referenceImageUrl = style.imageUrls[0];
        }
      }
    }
    console.log("==================================\n");
  } catch (error) {
    console.error("Failed to upload reference images:", error);
    console.warn("Using default reference images as fallback");
  }
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
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const { prompt, styleId, engine, userReferenceImages } = validationResult.data;
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
      const finalPrompt = buildPrompt(prompt, selectedStyle, hasUserReference);

      // Build image URLs array with priority order:
      // 1. User-selected reference images (highest priority)
      // 2. Style preset reference images
      const imageUrls: string[] = [];
      
      if (userReferenceImages && userReferenceImages.length > 0) {
        imageUrls.push(...userReferenceImages);
      }
      
      // Add all reference images for this style
      const styleReferenceUrls = getAllReferenceImageUrls(styleId);
      imageUrls.push(...styleReferenceUrls);

      console.log("\n=== Image Generation Request ===");
      console.log(`Engine: ${engine}`);
      console.log(`Style: ${selectedStyle.label} (${styleId})`);
      console.log(`User Prompt: ${prompt}`);
      console.log(`User Reference Images: ${userReferenceImages?.join(", ") || "None"}`);
      console.log(`Image URLs (priority order): ${imageUrls.join(", ")}`);
      console.log(`Final Prompt: ${finalPrompt}`);
      console.log("================================\n");

      const imageUrl =
        engine === "nanobanana"
          ? await callNanoBananaEdit(finalPrompt, imageUrls)
          : await callSeedream(finalPrompt);

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

  await initializeReferenceImages();

  const httpServer = createServer(app);

  return httpServer;
}

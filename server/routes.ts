import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { generateRequestSchema, generateResponseSchema, type StylePreset } from "@shared/schema";

// Define style presets with detailed visual descriptions
const STYLE_PRESETS: Array<StylePreset & { basePrompt: string }> = [
  {
    id: "cool_cyan_lineart",
    label: "Cool Cyan Vector Line Art",
    description: "Clean vector line art with cyan-blue gradient palette and minimal white background",
    engines: ["nanobanana", "seeddream"],
    basePrompt:
      "in the style of clean vector line art, cyan-blue gradient color palette, minimal white background, crisp lines, modern illustration style, geometric shapes",
  },
  {
    id: "warm_orange_flat",
    label: "Warm Orange Flat Illustration",
    description: "Warm orange/red flat illustration with strong contrast and almost white background",
    engines: ["nanobanana", "seeddream"],
    basePrompt:
      "in the style of warm orange and red flat illustration, strong contrast on main subject, almost white background, bold colors, simplified shapes, modern flat design",
  },
  {
    id: "photorealistic",
    label: "Photorealistic",
    description: "Hyper-realistic photography style with natural lighting and fine details",
    engines: ["nanobanana", "seeddream"],
    basePrompt:
      "photorealistic, highly detailed, natural lighting, professional photography, sharp focus, high resolution, 8k quality, realistic textures",
  },
  {
    id: "watercolor_painting",
    label: "Watercolor Painting",
    description: "Soft watercolor art with flowing colors and artistic brush strokes",
    engines: ["nanobanana", "seeddream"],
    basePrompt:
      "watercolor painting style, soft edges, flowing colors, artistic brush strokes, paper texture, delicate washes, traditional art medium",
  },
  {
    id: "pixel_art",
    label: "Pixel Art",
    description: "Retro 8-bit or 16-bit pixel art style with vibrant colors",
    engines: ["nanobanana", "seeddream"],
    basePrompt:
      "pixel art style, 16-bit graphics, retro gaming aesthetic, vibrant colors, sharp pixels, nostalgic feel, limited color palette",
  },
  {
    id: "anime_style",
    label: "Anime Style",
    description: "Japanese anime art with bold lines, expressive characters, and vibrant colors",
    engines: ["nanobanana", "seeddream"],
    basePrompt:
      "anime art style, manga inspired, bold clean lines, expressive eyes, vibrant colors, cel shading, Japanese animation aesthetic",
  },
  {
    id: "oil_painting",
    label: "Oil Painting",
    description: "Classic oil painting with rich textures and brushwork like the old masters",
    engines: ["nanobanana", "seeddream"],
    basePrompt:
      "oil painting style, thick brush strokes, rich textures, canvas texture visible, classical art, impressionist techniques, museum quality",
  },
  {
    id: "minimalist_abstract",
    label: "Minimalist Abstract",
    description: "Simple geometric shapes with minimal colors and clean composition",
    engines: ["nanobanana", "seeddream"],
    basePrompt:
      "minimalist abstract art, geometric shapes, limited color palette, clean composition, negative space, modern art, simple forms",
  },
];

const NANO_API_URL = "https://kie.ai/api/v1/image/edit";
const KIE_API_KEY = process.env.KIE_API_KEY;

async function callNanoBananaEdit(prompt: string) {
  if (!KIE_API_KEY) {
    throw new Error("KIE_API_KEY is not set in the environment");
  }

  const response = await fetch(NANO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KIE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/nano-banana-edit",
      prompt,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`NanoBanana failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  return data.output_url;
}

async function callSeedDream(prompt: string) {
  throw new Error(`SeedDream integration missing for prompt: ${prompt}`);
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

      const { prompt, styleId, engine } = validationResult.data;
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

      const finalPrompt = `${prompt} ${selectedStyle.basePrompt}`.trim();

      console.log("\n=== Image Generation Request ===");
      console.log(`Engine: ${engine}`);
      console.log(`Style: ${selectedStyle.label} (${styleId})`);
      console.log(`User Prompt: ${prompt}`);
      console.log(`Final Prompt: ${finalPrompt}`);
      console.log("================================\n");

      const imageUrl =
        engine === "nanobanana"
          ? await callNanoBananaEdit(finalPrompt)
          : await callSeedDream(finalPrompt);

      const responseValidation = generateResponseSchema.safeParse({ imageUrl });

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

  const httpServer = createServer(app);

  return httpServer;
}

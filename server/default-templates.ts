export interface DefaultTemplateConfig {
  styleId: string;
  templateData: Record<string, any>;
  referenceImages: string[];
}

export const DEFAULT_TEMPLATES: DefaultTemplateConfig[] = [
  {
    styleId: "cyan_sketchline_vector",
    templateData: {
      templateType: "structured",
      name: "Cool Cyan Vector Line Art",
      colorMode: "default",
      customColors: undefined,
      cameraComposition: {
        enabled: true,
        cameraAngle: "stable, undistorted view that clearly presents the subject",
        compositionLayout: "balanced framing",
        framing: "ensure the subject fits naturally without clipping or distortion",
        depthArrangement: "clearly separated foreground, midground, and background with proper scale",
      },
      environment: {
        enabled: true,
        setting: "[Scene description]",
        lighting: "soft, even light suitable for the scene",
        atmosphere: "match style tone",
        backgroundComplexity: "follow the same simplification level as the reference style",
      },
      mainCharacter: {
        enabled: true,
        pose: "natural posture derived from the described action",
        expression: "consistent with the character identity implied by the prompt",
        interaction: "accurately placed relative to props/environment with correct scale",
        clothing: "match character lock and respect style",
      },
      secondaryObjects: {
        enabled: true,
        objects: "follow the same stylization rules as the style preset",
        motionCues: "remain subtle and clean",
        scaleRules: "all objects obey correct scale and perspective",
      },
      styleEnforcement: {
        enabled: true,
        styleRules: "vector line art with smooth curves and minimal details, using bold cyan outlines and white fill. Style is clean and modern with geometric shapes.",
        colorPalette: "consistent across all scenes",
        textureDensity: "uniform detail density",
      },
      negativePrompt: {
        enabled: true,
        items: `- inconsistent character identity
- incorrect character proportions
- distorted anatomy or broken limbs
- incorrect object scale
- broken perspective or impossible angles
- unwanted changes in clothing or hairstyle
- mismatched art style within the same scene
- unintended extra characters or duplicated faces
- chaotic or cluttered composition
- low-quality details such as blurry shapes or noisy textures`,
      },
    },
    referenceImages: [
      "/reference-images/cyan_sketchline_vector/1.png",
      "/reference-images/cyan_sketchline_vector/2.png",
      "/reference-images/cyan_sketchline_vector/3.png",
    ],
  },
  {
    styleId: "warm_orange_flat",
    templateData: {
      templateType: "structured",
      name: "Warm Orange Flat Illustration",
      colorMode: "custom",
      customColors: {
        name: "Warm Orange Palette",
        colors: [
          {
            id: "warm-orange-color-1",
            name: "Warm Orange",
            value: "#FF6B35",
            usage: "primarily for main subject and focal points",
          },
          {
            id: "warm-orange-color-2",
            name: "Soft Cream",
            value: "#FFF8E7",
            usage: "for backgrounds and negative space",
          },
          {
            id: "warm-orange-color-3",
            name: "Deep Brown",
            value: "#4A3F35",
            usage: "for outlines and text elements",
          },
        ],
      },
      cameraComposition: {
        enabled: true,
        cameraAngle: "stable, undistorted view that clearly presents the subject",
        compositionLayout: "balanced framing",
        framing: "ensure the subject fits naturally without clipping or distortion",
        depthArrangement: "clearly separated foreground, midground, and background with proper scale",
      },
      environment: {
        enabled: true,
        setting: "[Scene description]",
        lighting: "soft, even light suitable for the scene",
        atmosphere: "match style tone",
        backgroundComplexity: "follow the same simplification level as the reference style",
      },
      mainCharacter: {
        enabled: true,
        pose: "natural posture derived from the described action",
        expression: "consistent with the character identity implied by the prompt",
        interaction: "accurately placed relative to props/environment with correct scale",
        clothing: "match character lock and respect style",
      },
      secondaryObjects: {
        enabled: true,
        objects: "follow the same stylization rules as the style preset",
        motionCues: "remain subtle and clean",
        scaleRules: "all objects obey correct scale and perspective",
      },
      styleEnforcement: {
        enabled: true,
        styleRules: "flat illustration with simple geometric shapes and minimal gradients. Style is warm, friendly, and approachable.",
        colorPalette: "consistent across all scenes",
        textureDensity: "uniform detail density",
      },
      negativePrompt: {
        enabled: true,
        items: `- inconsistent character identity
- incorrect character proportions
- distorted anatomy or broken limbs
- incorrect object scale
- broken perspective or impossible angles
- unwanted changes in clothing or hairstyle
- mismatched art style within the same scene
- unintended extra characters or duplicated faces
- chaotic or cluttered composition
- low-quality details such as blurry shapes or noisy textures`,
      },
    },
    referenceImages: [
      "/reference-images/warm_orange_flat/1.png",
      "/reference-images/warm_orange_flat/2.png",
      "/reference-images/warm_orange_flat/3.png",
    ],
  },
  {
    styleId: "simple_cyan_test",
    templateData: {
      name: "Simple Cyan (Test)",
      templateType: "simple",
      suffix: "white background, 8k resolution",
    },
    referenceImages: [
      "/reference-images/cyan_sketchline_vector/1.png",
      "/reference-images/cyan_sketchline_vector/2.png",
      "/reference-images/cyan_sketchline_vector/3.png",
    ],
  },
  {
    styleId: "cyan_sketchline_vector_v2",
    templateData: {
      name: "Sketchline Vector V2",
      templateType: "universal",
      // Updated styleKeywords per user feedback:
      // - Deep-blue outlines for characters AND background
      // - Cyan only for small accents
      // - Simple facial features (dot eyes, small curved mouth)
      styleKeywords: "clean deep-blue (#002B5C) line art with consistent medium line weight and smooth rounded strokes, simple dot eyes and small curved mouth, no nose, flat white face area with no shading, flat 2D illustration with most background outlines also in deep-blue for a unified clean look, soft cyan-to-blue gradient fills on clothing and main objects, solid deep-blue hair fill, only small accent marks in cyan (#00AEEF), no textures, no shadows, simplified anatomy and correct proportions",
      // Palette mode: "loose" recommended for better gradient behavior
      paletteMode: "loose",
      // Loose palette description (recommended - generates results most similar to reference)
      loosePalette: "Use a deep-blue line palette with soft cyan and blue accents. Apply gentle cyan-to-blue gradient fills on clothing and major objects. Keep background outlines mostly in deep blue with minimal cyan highlights. Avoid introducing any colors outside the blue-cyan family.",
      // Strict palette (optional - for brand color requirements)
      strictPalette: ["#002B5C", "#00AEEF", "#0084D7", "#FFFFFF"],
      // Updated rules per user feedback:
      // - Deep-blue outlines for both characters and background
      // - Restrict cyan to small accents
      rules: "Use deep-blue outlines for both characters and background to maintain consistency. Restrict cyan to small accent marks or object fills. Avoid using cyan for large background lines. Keep backgrounds simple and clean without clutter. Avoid shading and textures. Preserve flat 2D aesthetic and keep all colors inside the blue-cyan family on a white background. No text, no watermarks, no extra characters.",
      // Updated negativePrompt per user feedback:
      // Added "excessive cyan outlines, cyan background lines"
      negativePrompt: "excessive cyan outlines, cyan background lines, bad proportions, distorted limbs, extra faces, inconsistent character identity, blurry, noisy, cluttered background, text, watermark, logo, signature, mixed art styles, heavy shadows",
    },
    referenceImages: [
      "/reference-images/cyan_sketchline_vector/1.png",
      "/reference-images/cyan_sketchline_vector/2.png",
      "/reference-images/cyan_sketchline_vector/3.png",
    ],
  },
];

export function getDefaultTemplate(styleId: string): DefaultTemplateConfig | undefined {
  return DEFAULT_TEMPLATES.find(t => t.styleId === styleId);
}

export function getAllDefaultTemplateIds(): string[] {
  return DEFAULT_TEMPLATES.map(t => t.styleId);
}

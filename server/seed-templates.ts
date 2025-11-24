import { storage } from "./storage";

const defaultTemplates = [
  {
    styleId: "cyan_sketchline_vector",
    templateData: {
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
      name: "Warm Orange Flat Illustration",
      colorMode: "custom",
      customColors: {
        name: "Warm Orange Palette",
        colors: [
          {
            id: crypto.randomUUID(),
            name: "Warm Orange",
            value: "#FF6B35",
            usage: "primarily for main subject and focal points",
          },
          {
            id: crypto.randomUUID(),
            name: "Soft Cream",
            value: "#FFF8E7",
            usage: "for backgrounds and negative space",
          },
          {
            id: crypto.randomUUID(),
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
];

async function seedTemplates() {
  console.log("Seeding default templates...");
  
  for (const template of defaultTemplates) {
    try {
      await storage.saveTemplate(template.styleId, {
        templateData: template.templateData,
        referenceImages: template.referenceImages,
      });
      console.log(`✓ Seeded template for style: ${template.styleId}`);
    } catch (error) {
      console.error(`✗ Failed to seed template for ${template.styleId}:`, error);
    }
  }
  
  console.log("Template seeding complete!");
  process.exit(0);
}

seedTemplates();

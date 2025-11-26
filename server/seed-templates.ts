import { storage } from "./storage";
import { DEFAULT_TEMPLATES } from "./default-templates";

async function seedTemplates() {
  console.log("Seeding default templates...");
  
  for (const template of DEFAULT_TEMPLATES) {
    try {
      await storage.saveTemplate(
        template.styleId, 
        template.templateData,
        template.referenceImages
      );
      console.log(`✓ Seeded template for style: ${template.styleId}`);
    } catch (error) {
      console.error(`✗ Failed to seed template for ${template.styleId}:`, error);
    }
  }
  
  console.log("Template seeding complete!");
  process.exit(0);
}

seedTemplates();

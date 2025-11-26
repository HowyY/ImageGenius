import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { desc, eq, and } from "drizzle-orm";
import {
  generationHistory,
  promptTemplates,
  styles,
  storyboardScenes,
  type InsertGenerationHistory,
  type SelectGenerationHistory,
  type InsertPromptTemplate,
  type SelectPromptTemplate,
  type InsertStyle,
  type SelectStyle,
  type InsertStoryboardScene,
  type UpdateStoryboardScene,
  type SelectStoryboardScene,
} from "@shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;

let db: ReturnType<typeof drizzle> | null = null;

if (DATABASE_URL) {
  const sql = neon(DATABASE_URL);
  db = drizzle(sql);
}

export interface IStorage {
  saveGenerationHistory(data: InsertGenerationHistory): Promise<SelectGenerationHistory>;
  getGenerationHistory(limit?: number): Promise<SelectGenerationHistory[]>;
  getTemplate(styleId: string): Promise<SelectPromptTemplate | null>;
  getAllTemplates(): Promise<SelectPromptTemplate[]>;
  saveTemplate(styleId: string, templateData: any, referenceImages?: string[]): Promise<SelectPromptTemplate>;
  deleteTemplate(styleId: string): Promise<void>;
  // Style CRUD operations
  getAllStyles(): Promise<SelectStyle[]>;
  getStyle(styleId: string): Promise<SelectStyle | null>;
  createStyle(data: InsertStyle): Promise<SelectStyle>;
  updateStyle(styleId: string, data: Partial<InsertStyle>): Promise<SelectStyle | null>;
  deleteStyle(styleId: string): Promise<boolean>;
  seedBuiltInStyles(builtInStyles: InsertStyle[]): Promise<void>;
  // Storyboard scene operations
  getAllScenes(): Promise<SelectStoryboardScene[]>;
  getScene(id: number): Promise<SelectStoryboardScene | null>;
  createScene(data: InsertStoryboardScene): Promise<SelectStoryboardScene>;
  updateScene(id: number, data: UpdateStoryboardScene): Promise<SelectStoryboardScene | null>;
  deleteScene(id: number): Promise<boolean>;
  reorderScenes(sceneIds: number[]): Promise<void>;
}

export class MemStorage implements IStorage {
  async saveGenerationHistory(data: InsertGenerationHistory): Promise<SelectGenerationHistory> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }
    
    const [result] = await db
      .insert(generationHistory)
      .values({
        prompt: data.prompt,
        styleId: data.styleId,
        styleLabel: data.styleLabel,
        engine: data.engine,
        finalPrompt: data.finalPrompt,
        referenceImageUrl: data.referenceImageUrl,
        generatedImageUrl: data.generatedImageUrl,
        userReferenceUrls: data.userReferenceUrls,
        allReferenceImageUrls: data.allReferenceImageUrls,
      })
      .returning();
    return result;
  }

  async getGenerationHistory(limit: number = 50): Promise<SelectGenerationHistory[]> {
    if (!db) {
      return [];
    }
    
    return await db
      .select()
      .from(generationHistory)
      .orderBy(desc(generationHistory.createdAt))
      .limit(limit);
  }

  async getTemplate(styleId: string): Promise<SelectPromptTemplate | null> {
    if (!db) {
      return null;
    }

    const results = await db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.styleId, styleId))
      .limit(1);

    return results[0] || null;
  }

  async getAllTemplates(): Promise<SelectPromptTemplate[]> {
    if (!db) {
      return [];
    }

    return await db
      .select()
      .from(promptTemplates)
      .orderBy(promptTemplates.styleId);
  }

  async saveTemplate(styleId: string, templateData: any, referenceImages: string[] = []): Promise<SelectPromptTemplate> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    // Check if template already exists
    const existing = await this.getTemplate(styleId);

    if (existing) {
      // Update existing template
      const [result] = await db
        .update(promptTemplates)
        .set({
          templateData,
          referenceImages,
          updatedAt: new Date(),
        })
        .where(eq(promptTemplates.styleId, styleId))
        .returning();
      return result;
    } else {
      // Insert new template
      const [result] = await db
        .insert(promptTemplates)
        .values({
          styleId,
          templateData,
          referenceImages,
        })
        .returning();
      return result;
    }
  }

  async deleteTemplate(styleId: string): Promise<void> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    await db.delete(promptTemplates).where(eq(promptTemplates.styleId, styleId));
  }

  // Style CRUD operations
  async getAllStyles(): Promise<SelectStyle[]> {
    if (!db) {
      return [];
    }

    return await db
      .select()
      .from(styles)
      .orderBy(styles.label);
  }

  async getStyle(styleId: string): Promise<SelectStyle | null> {
    if (!db) {
      return null;
    }

    const results = await db
      .select()
      .from(styles)
      .where(eq(styles.id, styleId))
      .limit(1);

    return results[0] || null;
  }

  async createStyle(data: InsertStyle): Promise<SelectStyle> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    const [result] = await db
      .insert(styles)
      .values({
        id: data.id,
        label: data.label,
        description: data.description,
        engines: data.engines,
        basePrompt: data.basePrompt,
        defaultColors: data.defaultColors,
        referenceImageUrl: data.referenceImageUrl,
        isBuiltIn: data.isBuiltIn ?? false,
      })
      .returning();
    return result;
  }

  async updateStyle(styleId: string, data: Partial<InsertStyle>): Promise<SelectStyle | null> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    const [result] = await db
      .update(styles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(styles.id, styleId))
      .returning();
    return result || null;
  }

  async deleteStyle(styleId: string): Promise<boolean> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    // Check if style exists and is not built-in
    const style = await this.getStyle(styleId);
    if (!style) {
      return false;
    }
    if (style.isBuiltIn) {
      throw new Error("Cannot delete built-in styles");
    }

    // Delete associated template first
    await this.deleteTemplate(styleId);

    // Delete the style
    await db.delete(styles).where(eq(styles.id, styleId));
    return true;
  }

  async seedBuiltInStyles(builtInStyles: InsertStyle[]): Promise<void> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    for (const style of builtInStyles) {
      const existing = await this.getStyle(style.id);
      if (!existing) {
        await this.createStyle({ ...style, isBuiltIn: true });
      }
    }
  }

  // Storyboard scene operations
  async getAllScenes(): Promise<SelectStoryboardScene[]> {
    if (!db) {
      return [];
    }

    return await db
      .select()
      .from(storyboardScenes)
      .orderBy(storyboardScenes.orderIndex);
  }

  async getScene(id: number): Promise<SelectStoryboardScene | null> {
    if (!db) {
      return null;
    }

    const results = await db
      .select()
      .from(storyboardScenes)
      .where(eq(storyboardScenes.id, id))
      .limit(1);

    return results[0] || null;
  }

  async createScene(data: InsertStoryboardScene): Promise<SelectStoryboardScene> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    // Get the next order index
    const allScenes = await this.getAllScenes();
    const nextOrderIndex = data.orderIndex ?? allScenes.length;

    const [result] = await db
      .insert(storyboardScenes)
      .values({
        orderIndex: nextOrderIndex,
        prompt: data.prompt ?? "",
        generatedImageUrl: data.generatedImageUrl,
        styleId: data.styleId,
        engine: data.engine,
      })
      .returning();
    return result;
  }

  async updateScene(id: number, data: UpdateStoryboardScene): Promise<SelectStoryboardScene | null> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    const updateData: any = { updatedAt: new Date() };
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.prompt !== undefined) updateData.prompt = data.prompt;
    if (data.generatedImageUrl !== undefined) updateData.generatedImageUrl = data.generatedImageUrl;
    if (data.styleId !== undefined) updateData.styleId = data.styleId;
    if (data.engine !== undefined) updateData.engine = data.engine;

    const [result] = await db
      .update(storyboardScenes)
      .set(updateData)
      .where(eq(storyboardScenes.id, id))
      .returning();
    return result || null;
  }

  async deleteScene(id: number): Promise<boolean> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    const scene = await this.getScene(id);
    if (!scene) {
      return false;
    }

    await db.delete(storyboardScenes).where(eq(storyboardScenes.id, id));
    return true;
  }

  async reorderScenes(sceneIds: number[]): Promise<void> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    for (let i = 0; i < sceneIds.length; i++) {
      await db
        .update(storyboardScenes)
        .set({ orderIndex: i, updatedAt: new Date() })
        .where(eq(storyboardScenes.id, sceneIds[i]));
    }
  }
}

export const storage = new MemStorage();

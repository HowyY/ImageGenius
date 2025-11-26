import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { desc, eq, and, isNull } from "drizzle-orm";
import {
  generationHistory,
  promptTemplates,
  styles,
  storyboards,
  storyboardVersions,
  storyboardScenes,
  type InsertGenerationHistory,
  type SelectGenerationHistory,
  type InsertPromptTemplate,
  type SelectPromptTemplate,
  type InsertStyle,
  type SelectStyle,
  type InsertStoryboard,
  type UpdateStoryboard,
  type SelectStoryboard,
  type InsertStoryboardVersion,
  type SelectStoryboardVersion,
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
  getGenerationHistoryBySceneId(sceneId: number): Promise<SelectGenerationHistory[]>;
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
  // Storyboard CRUD operations
  getAllStoryboards(): Promise<SelectStoryboard[]>;
  getStoryboard(id: number): Promise<SelectStoryboard | null>;
  createStoryboard(data: InsertStoryboard): Promise<SelectStoryboard>;
  updateStoryboard(id: number, data: UpdateStoryboard): Promise<SelectStoryboard | null>;
  deleteStoryboard(id: number): Promise<boolean>;
  // Storyboard version operations
  getStoryboardVersions(storyboardId: number): Promise<SelectStoryboardVersion[]>;
  getStoryboardVersion(id: number): Promise<SelectStoryboardVersion | null>;
  createStoryboardVersion(storyboardId: number, name: string, description?: string): Promise<SelectStoryboardVersion>;
  restoreStoryboardVersion(versionId: number): Promise<SelectStoryboard | null>;
  deleteStoryboardVersion(id: number): Promise<boolean>;
  // Storyboard scene operations
  getAllScenes(): Promise<SelectStoryboardScene[]>;
  getScenesByStoryboardId(storyboardId: number): Promise<SelectStoryboardScene[]>;
  getScene(id: number): Promise<SelectStoryboardScene | null>;
  createScene(data: InsertStoryboardScene): Promise<SelectStoryboardScene>;
  updateScene(id: number, data: UpdateStoryboardScene): Promise<SelectStoryboardScene | null>;
  deleteScene(id: number): Promise<boolean>;
  reorderScenes(sceneIds: number[]): Promise<void>;
  migrateScenesToStoryboard(storyboardId: number): Promise<void>;
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
        sceneId: data.sceneId,
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

  async getGenerationHistoryBySceneId(sceneId: number): Promise<SelectGenerationHistory[]> {
    if (!db) {
      return [];
    }
    
    return await db
      .select()
      .from(generationHistory)
      .where(eq(generationHistory.sceneId, sceneId))
      .orderBy(desc(generationHistory.createdAt));
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

    // Get the next order index for scenes in the same storyboard
    let nextOrderIndex = data.orderIndex;
    if (nextOrderIndex === undefined) {
      if (data.storyboardId) {
        const storyboardScenesList = await this.getScenesByStoryboardId(data.storyboardId);
        nextOrderIndex = storyboardScenesList.length;
      } else {
        const allScenes = await this.getAllScenes();
        nextOrderIndex = allScenes.length;
      }
    }

    const [result] = await db
      .insert(storyboardScenes)
      .values({
        storyboardId: data.storyboardId,
        orderIndex: nextOrderIndex,
        voiceOver: data.voiceOver ?? "",
        visualDescription: data.visualDescription ?? "",
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
    if (data.voiceOver !== undefined) updateData.voiceOver = data.voiceOver;
    if (data.visualDescription !== undefined) updateData.visualDescription = data.visualDescription;
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

  // Storyboard CRUD operations
  async getAllStoryboards(): Promise<SelectStoryboard[]> {
    if (!db) {
      return [];
    }

    return await db
      .select()
      .from(storyboards)
      .orderBy(desc(storyboards.updatedAt));
  }

  async getStoryboard(id: number): Promise<SelectStoryboard | null> {
    if (!db) {
      return null;
    }

    const results = await db
      .select()
      .from(storyboards)
      .where(eq(storyboards.id, id))
      .limit(1);

    return results[0] || null;
  }

  async createStoryboard(data: InsertStoryboard): Promise<SelectStoryboard> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    const [result] = await db
      .insert(storyboards)
      .values({
        name: data.name,
        description: data.description ?? "",
        styleId: data.styleId,
        engine: data.engine,
      })
      .returning();
    return result;
  }

  async updateStoryboard(id: number, data: UpdateStoryboard): Promise<SelectStoryboard | null> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.styleId !== undefined) updateData.styleId = data.styleId;
    if (data.engine !== undefined) updateData.engine = data.engine;

    const [result] = await db
      .update(storyboards)
      .set(updateData)
      .where(eq(storyboards.id, id))
      .returning();
    return result || null;
  }

  async deleteStoryboard(id: number): Promise<boolean> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    const storyboard = await this.getStoryboard(id);
    if (!storyboard) {
      return false;
    }

    // Delete all scenes in this storyboard
    await db.delete(storyboardScenes).where(eq(storyboardScenes.storyboardId, id));
    
    // Delete all versions of this storyboard
    await db.delete(storyboardVersions).where(eq(storyboardVersions.storyboardId, id));
    
    // Delete the storyboard
    await db.delete(storyboards).where(eq(storyboards.id, id));
    return true;
  }

  // Storyboard version operations
  async getStoryboardVersions(storyboardId: number): Promise<SelectStoryboardVersion[]> {
    if (!db) {
      return [];
    }

    return await db
      .select()
      .from(storyboardVersions)
      .where(eq(storyboardVersions.storyboardId, storyboardId))
      .orderBy(desc(storyboardVersions.versionNumber));
  }

  async getStoryboardVersion(id: number): Promise<SelectStoryboardVersion | null> {
    if (!db) {
      return null;
    }

    const results = await db
      .select()
      .from(storyboardVersions)
      .where(eq(storyboardVersions.id, id))
      .limit(1);

    return results[0] || null;
  }

  async createStoryboardVersion(storyboardId: number, name: string, description: string = ""): Promise<SelectStoryboardVersion> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    // Get the storyboard
    const storyboard = await this.getStoryboard(storyboardId);
    if (!storyboard) {
      throw new Error("Storyboard not found");
    }

    // Get current scenes
    const scenes = await this.getScenesByStoryboardId(storyboardId);

    // Get next version number
    const existingVersions = await this.getStoryboardVersions(storyboardId);
    const nextVersionNumber = existingVersions.length > 0 
      ? Math.max(...existingVersions.map(v => v.versionNumber)) + 1 
      : 1;

    // Create snapshot of scenes (store essential data)
    const scenesSnapshot = scenes.map(scene => ({
      orderIndex: scene.orderIndex,
      voiceOver: scene.voiceOver,
      visualDescription: scene.visualDescription,
      generatedImageUrl: scene.generatedImageUrl,
      styleId: scene.styleId,
      engine: scene.engine,
    }));

    const [result] = await db
      .insert(storyboardVersions)
      .values({
        storyboardId,
        versionNumber: nextVersionNumber,
        name,
        description,
        scenesSnapshot,
        styleId: storyboard.styleId,
        engine: storyboard.engine,
      })
      .returning();
    return result;
  }

  async restoreStoryboardVersion(versionId: number): Promise<SelectStoryboard | null> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    // Get the version
    const version = await this.getStoryboardVersion(versionId);
    if (!version) {
      return null;
    }

    // Get the storyboard
    const storyboard = await this.getStoryboard(version.storyboardId);
    if (!storyboard) {
      return null;
    }

    // Delete current scenes
    await db.delete(storyboardScenes).where(eq(storyboardScenes.storyboardId, version.storyboardId));

    // Restore scenes from snapshot
    const scenesSnapshot = version.scenesSnapshot as any[];
    for (const sceneData of scenesSnapshot) {
      await db
        .insert(storyboardScenes)
        .values({
          storyboardId: version.storyboardId,
          orderIndex: sceneData.orderIndex,
          voiceOver: sceneData.voiceOver || "",
          visualDescription: sceneData.visualDescription || "",
          generatedImageUrl: sceneData.generatedImageUrl,
          styleId: sceneData.styleId,
          engine: sceneData.engine,
        });
    }

    // Update storyboard settings if they were different
    const [updatedStoryboard] = await db
      .update(storyboards)
      .set({
        styleId: version.styleId,
        engine: version.engine,
        updatedAt: new Date(),
      })
      .where(eq(storyboards.id, version.storyboardId))
      .returning();

    return updatedStoryboard;
  }

  async deleteStoryboardVersion(id: number): Promise<boolean> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    const version = await this.getStoryboardVersion(id);
    if (!version) {
      return false;
    }

    await db.delete(storyboardVersions).where(eq(storyboardVersions.id, id));
    return true;
  }

  // Get scenes by storyboard ID
  async getScenesByStoryboardId(storyboardId: number): Promise<SelectStoryboardScene[]> {
    if (!db) {
      return [];
    }

    return await db
      .select()
      .from(storyboardScenes)
      .where(eq(storyboardScenes.storyboardId, storyboardId))
      .orderBy(storyboardScenes.orderIndex);
  }

  // Migrate orphan scenes (null storyboardId) to a specific storyboard
  async migrateScenesToStoryboard(storyboardId: number): Promise<void> {
    if (!db) {
      throw new Error("Database is not configured. Set DATABASE_URL environment variable.");
    }

    // Find all scenes without a storyboardId
    const orphanScenes = await db
      .select()
      .from(storyboardScenes)
      .where(isNull(storyboardScenes.storyboardId))
      .orderBy(storyboardScenes.orderIndex);

    // Get current max order index in target storyboard
    const existingScenes = await this.getScenesByStoryboardId(storyboardId);
    let nextOrderIndex = existingScenes.length;

    // Update orphan scenes to belong to the storyboard
    for (const scene of orphanScenes) {
      await db
        .update(storyboardScenes)
        .set({ 
          storyboardId, 
          orderIndex: nextOrderIndex++,
          updatedAt: new Date() 
        })
        .where(eq(storyboardScenes.id, scene.id));
    }
  }
}

export const storage = new MemStorage();

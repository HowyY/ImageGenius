import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { desc, eq } from "drizzle-orm";
import {
  generationHistory,
  promptTemplates,
  type InsertGenerationHistory,
  type SelectGenerationHistory,
  type InsertPromptTemplate,
  type SelectPromptTemplate,
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
  saveTemplate(styleId: string, templateData: any, referenceImages?: string[]): Promise<SelectPromptTemplate>;
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
}

export const storage = new MemStorage();

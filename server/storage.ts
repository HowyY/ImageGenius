import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { desc } from "drizzle-orm";
import {
  generationHistory,
  type InsertGenerationHistory,
  type SelectGenerationHistory,
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
        characterReferenceUrl: data.characterReferenceUrl,
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
}

export const storage = new MemStorage();

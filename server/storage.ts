// This file is not used in the current implementation.
// The AI Image Generator app doesn't require persistent storage.
// Style presets are defined in server/routes.ts
// and image generation is handled via API endpoints.

export interface IStorage {
  // Empty interface - no storage operations needed
}

export class MemStorage implements IStorage {
  constructor() {
    // No-op
  }
}

export const storage = new MemStorage();

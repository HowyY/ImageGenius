const STYLE_LOCK_KEY = 'ai_generator_style_lock';
const LOCKED_STYLE_ID_KEY = 'ai_generator_locked_style_id';
const LAST_GENERATED_IMAGE_KEY = 'ai_generator_last_generated_image';
const USER_REFERENCE_IMAGES_KEY = 'ai_generator_user_reference_images';
const PROMPT_KEY = 'ai_generator_prompt';
const ENGINE_KEY = 'ai_generator_engine';
const SELECTED_STYLE_KEY = 'ai_generator_selected_style';

export interface GenerationState {
  styleLocked: boolean;
  lockedStyleId: string | null;
  lastGeneratedImage: string | null;
  userReferenceImages: string[];
  prompt: string;
  engine: string;
  selectedStyleId: string | null;
}

export function getStyleLock(): { locked: boolean; styleId: string | null } {
  const locked = localStorage.getItem(STYLE_LOCK_KEY) === 'true';
  const styleId = localStorage.getItem(LOCKED_STYLE_ID_KEY);
  return { locked, styleId };
}

export function setStyleLock(locked: boolean, styleId: string | null): void {
  localStorage.setItem(STYLE_LOCK_KEY, locked.toString());
  if (locked && styleId) {
    localStorage.setItem(LOCKED_STYLE_ID_KEY, styleId);
  } else {
    localStorage.removeItem(LOCKED_STYLE_ID_KEY);
  }
}

export function getLastGeneratedImage(): string | null {
  return localStorage.getItem(LAST_GENERATED_IMAGE_KEY);
}

export function setLastGeneratedImage(imageUrl: string | null): void {
  if (imageUrl) {
    localStorage.setItem(LAST_GENERATED_IMAGE_KEY, imageUrl);
  } else {
    localStorage.removeItem(LAST_GENERATED_IMAGE_KEY);
  }
}

export function clearLastGeneratedImage(): void {
  localStorage.removeItem(LAST_GENERATED_IMAGE_KEY);
}

export function getUserReferenceImages(): string[] {
  const stored = localStorage.getItem(USER_REFERENCE_IMAGES_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

export function setUserReferenceImages(imageUrls: string[]): void {
  const limited = imageUrls.slice(0, 3);
  localStorage.setItem(USER_REFERENCE_IMAGES_KEY, JSON.stringify(limited));
}

export function addUserReferenceImage(imageUrl: string): boolean {
  const current = getUserReferenceImages();
  if (current.length >= 3) return false;
  if (current.includes(imageUrl)) return false;
  const updated = [...current, imageUrl];
  setUserReferenceImages(updated);
  return true;
}

export function removeUserReferenceImage(imageUrl: string): void {
  const current = getUserReferenceImages();
  const updated = current.filter(url => url !== imageUrl);
  setUserReferenceImages(updated);
}

export function reorderUserReferenceImages(fromIndex: number, toIndex: number): void {
  const current = getUserReferenceImages();
  if (fromIndex < 0 || fromIndex >= current.length || toIndex < 0 || toIndex >= current.length) {
    return;
  }
  const updated = [...current];
  const [moved] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, moved);
  setUserReferenceImages(updated);
}

export function clearUserReferenceImages(): void {
  localStorage.removeItem(USER_REFERENCE_IMAGES_KEY);
}

// Prompt persistence
export function getPrompt(): string {
  return localStorage.getItem(PROMPT_KEY) || '';
}

export function setPrompt(prompt: string): void {
  localStorage.setItem(PROMPT_KEY, prompt);
}

export function clearPrompt(): void {
  localStorage.removeItem(PROMPT_KEY);
}

// Engine persistence
export function getEngine(): string {
  return localStorage.getItem(ENGINE_KEY) || 'nanobanana';
}

export function setEngine(engine: string): void {
  localStorage.setItem(ENGINE_KEY, engine);
}

// Selected style persistence (separate from locked style)
export function getSelectedStyleId(): string | null {
  return localStorage.getItem(SELECTED_STYLE_KEY);
}

export function setSelectedStyleId(styleId: string | null): void {
  if (styleId) {
    localStorage.setItem(SELECTED_STYLE_KEY, styleId);
  } else {
    localStorage.removeItem(SELECTED_STYLE_KEY);
  }
}

export function getGenerationState(): GenerationState {
  const { locked, styleId } = getStyleLock();
  const lastGeneratedImage = getLastGeneratedImage();
  const userReferenceImages = getUserReferenceImages();
  const prompt = getPrompt();
  const engine = getEngine();
  const selectedStyleId = getSelectedStyleId();
  return {
    styleLocked: locked,
    lockedStyleId: styleId,
    lastGeneratedImage,
    userReferenceImages,
    prompt,
    engine,
    selectedStyleId,
  };
}

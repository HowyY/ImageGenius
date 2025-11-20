const STYLE_LOCK_KEY = 'ai_generator_style_lock';
const LOCKED_STYLE_ID_KEY = 'ai_generator_locked_style_id';
const CHARACTER_REFERENCE_KEY = 'ai_generator_character_reference';

export interface GenerationState {
  styleLocked: boolean;
  lockedStyleId: string | null;
  characterReference: string | null;
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

export function getCharacterReference(): string | null {
  return localStorage.getItem(CHARACTER_REFERENCE_KEY);
}

export function setCharacterReference(imageUrl: string | null): void {
  if (imageUrl) {
    localStorage.setItem(CHARACTER_REFERENCE_KEY, imageUrl);
  } else {
    localStorage.removeItem(CHARACTER_REFERENCE_KEY);
  }
}

export function clearCharacterReference(): void {
  localStorage.removeItem(CHARACTER_REFERENCE_KEY);
}

export function getGenerationState(): GenerationState {
  const { locked, styleId } = getStyleLock();
  const characterReference = getCharacterReference();
  return {
    styleLocked: locked,
    lockedStyleId: styleId,
    characterReference,
  };
}

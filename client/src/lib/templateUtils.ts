import type { PromptTemplate } from "@shared/schema";

/**
 * Normalizes a prompt template by cleaning up empty customColors arrays.
 * If colorMode is "custom" but no colors are defined, it resets to "default" mode
 * and removes customColors to prevent validation errors.
 * 
 * @param template - The template to normalize
 * @returns The normalized template with valid colorMode
 */
export function normalizeTemplateColors<T extends Partial<PromptTemplate>>(
  template: T
): T {
  if (
    template.colorMode === "custom" &&
    (!template.customColors?.colors || template.customColors.colors.length === 0)
  ) {
    return {
      ...template,
      colorMode: "default" as const,
      customColors: undefined,
    };
  }

  // Ensure colorMode has a default value if not set
  if (!template.colorMode) {
    return {
      ...template,
      colorMode: "default" as const,
    };
  }

  return template;
}

import type { PromptTemplate } from "@shared/schema";

/**
 * Normalizes a prompt template by cleaning up empty customColors arrays
 * and removing fields that are not part of the schema (like referenceImages).
 * If colorMode is "custom" but no colors are defined, it resets to "default" mode
 * and removes customColors to prevent validation errors.
 * 
 * @param template - The template to normalize
 * @returns The normalized template with valid colorMode and schema-compliant fields
 */
export function normalizeTemplateColors<T extends Partial<PromptTemplate>>(
  template: T
): T {
  // Create a clean copy without non-schema fields like referenceImages
  const { referenceImages, ...cleanTemplate } = template as any;

  // Check if colorMode is custom but has no colors
  if (
    cleanTemplate.colorMode === "custom" &&
    (!cleanTemplate.customColors?.colors || cleanTemplate.customColors.colors.length === 0)
  ) {
    return {
      ...cleanTemplate,
      colorMode: "default" as const,
      customColors: undefined,
    };
  }

  // Ensure colorMode has a default value if not set
  if (!cleanTemplate.colorMode) {
    return {
      ...cleanTemplate,
      colorMode: "default" as const,
    };
  }

  return cleanTemplate;
}

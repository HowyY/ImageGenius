
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, Eye, Copy, RotateCcw, Palette, Upload, X, GripVertical, Image as ImageIcon, Maximize2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StylePreset, Color } from "@shared/schema";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { ColorPaletteManager } from "@/components/ColorPaletteManager";
import { normalizeTemplateColors } from "@/lib/templateUtils";

interface ImageReference {
  id: string;
  url: string;
}

interface StructuredTemplate {
  name: string;
  templateType?: "structured";
  referenceImages?: ImageReference[];
  colorMode?: "default" | "custom";
  customColors?: {
    name?: string;
    colors: Color[];
  };
  cameraComposition: {
    enabled: boolean;
    cameraAngle: string;
    compositionLayout: string;
    framing: string;
    depthArrangement: string;
  };
  environment: {
    enabled: boolean;
    setting: string;
    lighting: string;
    atmosphere: string;
    backgroundComplexity: string;
  };
  mainCharacter: {
    enabled: boolean;
    pose: string;
    expression: string;
    interaction: string;
    clothing: string;
  };
  secondaryObjects: {
    enabled: boolean;
    objects: string;
    motionCues: string;
    scaleRules: string;
  };
  styleEnforcement: {
    enabled: boolean;
    styleRules: string;
    colorPalette: string;
    textureDensity: string;
  };
  negativePrompt: {
    enabled: boolean;
    items: string;
  };
}

interface SimpleTemplate {
  name: string;
  templateType: "simple";
  suffix: string;
  referenceImages?: ImageReference[];
}

interface UniversalTemplate {
  name: string;
  templateType: "universal";
  styleKeywords: string;
  defaultPalette: string[];
  rules: string;
  negativePrompt: string;
  referenceImages?: ImageReference[];
}

type PromptTemplate = StructuredTemplate | SimpleTemplate | UniversalTemplate;

function isSimpleTemplate(template: PromptTemplate): template is SimpleTemplate {
  return (template as SimpleTemplate).templateType === "simple";
}

function isUniversalTemplate(template: PromptTemplate): template is UniversalTemplate {
  return (template as UniversalTemplate).templateType === "universal";
}

function isStructuredTemplate(template: PromptTemplate): template is StructuredTemplate {
  return !isSimpleTemplate(template) && !isUniversalTemplate(template);
}

const DEFAULT_TEMPLATE: StructuredTemplate = {
  name: "Default Template",
  templateType: "structured",
  colorMode: "default",
  customColors: undefined,
  cameraComposition: {
    enabled: true,
    cameraAngle: "stable, undistorted view that clearly presents the subject",
    compositionLayout: "balanced framing",
    framing: "ensure the subject fits naturally without clipping or distortion",
    depthArrangement: "clearly separated foreground, midground, and background with proper scale",
  },
  environment: {
    enabled: true,
    setting: "[Scene description]",
    lighting: "soft, even light suitable for the scene",
    atmosphere: "match style tone",
    backgroundComplexity: "follow the same simplification level as the reference style",
  },
  mainCharacter: {
    enabled: true,
    pose: "natural posture derived from the described action",
    expression: "consistent with the character identity implied by the prompt",
    interaction: "accurately placed relative to props/environment with correct scale",
    clothing: "match character lock and respect style",
  },
  secondaryObjects: {
    enabled: true,
    objects: "follow the same stylization rules as the style preset",
    motionCues: "remain subtle and clean",
    scaleRules: "all objects obey correct scale and perspective",
  },
  styleEnforcement: {
    enabled: true,
    styleRules: "maintain consistent color palette, lighting, texture density, and stroke treatment",
    colorPalette: "consistent across all scenes",
    textureDensity: "uniform detail density",
  },
  negativePrompt: {
    enabled: true,
    items: `- inconsistent character identity
- incorrect character proportions
- distorted anatomy or broken limbs
- incorrect object scale
- broken perspective or impossible angles
- unwanted changes in clothing or hairstyle
- mismatched art style within the same scene
- unintended extra characters or duplicated faces
- chaotic or cluttered composition
- low-quality details such as blurry shapes or noisy textures`,
  },
};

export default function PromptEditor() {
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const [template, setTemplate] = useState<PromptTemplate>(DEFAULT_TEMPLATE);
  const [previewPrompt, setPreviewPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<ImageReference[]>([]);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isDraggingTouch = useRef<boolean>(false);
  const isInitialRender = useRef<boolean>(true);
  const { toast } = useToast();

  const { data: styles, isLoading: stylesLoading } = useQuery<StylePreset[]>({
    queryKey: ["/api/styles"],
  });

  // Load template from database
  const { data: savedTemplate, isLoading: templateLoading } = useQuery<{
    id: number;
    styleId: string;
    templateData: any;
    referenceImages: string[];
    createdAt: Date;
    updatedAt: Date;
  } | null>({
    queryKey: ["/api/templates", selectedStyleId],
    enabled: !!selectedStyleId,
    retry: false,
  });

  useEffect(() => {
    // Load the first style by default
    if (styles && styles.length > 0 && !selectedStyleId) {
      setSelectedStyleId(styles[0].id);
    }
  }, [styles, selectedStyleId]);

  // Helper function to generate preview for simple templates immediately
  const generateSimplePreview = (simpleTemplate: SimpleTemplate, basePrompt: string) => {
    const suffix = simpleTemplate.suffix || "white background, 8k resolution";
    return `{userPrompt}, ${basePrompt}, ${suffix}`;
  };

  // Helper function to generate preview for universal templates immediately
  const generateUniversalPreview = (universalTemplate: UniversalTemplate, styleName: string) => {
    const styleKeywords = universalTemplate.styleKeywords || "";
    const rules = universalTemplate.rules || "";
    const negativePrompt = universalTemplate.negativePrompt || "";
    const paletteColors = (universalTemplate.defaultPalette || []).join(", ");
    
    let prompt = `[SCENE]
{userPrompt}

[FRAMING]
Medium shot, balanced composition

[STYLE]
In ${styleName} style:
${styleKeywords}`;

    if (paletteColors) {
      prompt += `

[COLORS]
Use the following palette:
${paletteColors}.
Follow the palette's saturation and contrast.`;
    }

    if (rules) {
      prompt += `

[RULES]
${rules}`;
    }

    if (negativePrompt) {
      prompt += `

[NEGATIVE]
${negativePrompt}`;
    }

    return prompt;
  };

  useEffect(() => {
    // Load template when selectedStyleId changes or template data arrives
    if (selectedStyleId && styles && !templateLoading) {
      // Find the selected style to get its label
      const selectedStyle = styles.find(s => s.id === selectedStyleId);
      
      if (savedTemplate && savedTemplate.templateData) {
        try {
          const loadedTemplate = savedTemplate.templateData;
          
          // Check if this is a simple template - don't merge with structured defaults
          if (loadedTemplate.templateType === "simple") {
            // Simple template - preserve its structure as-is
            setTemplate(loadedTemplate);
            // Immediately generate simple preview to avoid race condition
            const basePrompt = selectedStyle?.basePrompt || "style base prompt";
            setPreviewPrompt(generateSimplePreview(loadedTemplate as SimpleTemplate, basePrompt));
          } else if (loadedTemplate.templateType === "universal") {
            // Universal template (v2) - preserve its structure as-is
            setTemplate(loadedTemplate);
            // Generate universal preview immediately
            const styleName = loadedTemplate.name || selectedStyle?.label || "Style";
            setPreviewPrompt(generateUniversalPreview(loadedTemplate as UniversalTemplate, styleName));
          } else {
            // Structured template - merge with DEFAULT_TEMPLATE to ensure all fields exist
            const mergedTemplate = {
              ...DEFAULT_TEMPLATE,
              ...loadedTemplate,
              // Merge nested objects properly
              cameraComposition: {
                ...DEFAULT_TEMPLATE.cameraComposition,
                ...(loadedTemplate.cameraComposition || {}),
              },
              environment: {
                ...DEFAULT_TEMPLATE.environment,
                ...(loadedTemplate.environment || {}),
              },
              mainCharacter: {
                ...DEFAULT_TEMPLATE.mainCharacter,
                ...(loadedTemplate.mainCharacter || {}),
              },
              secondaryObjects: {
                ...DEFAULT_TEMPLATE.secondaryObjects,
                ...(loadedTemplate.secondaryObjects || {}),
              },
              styleEnforcement: {
                ...DEFAULT_TEMPLATE.styleEnforcement,
                ...(loadedTemplate.styleEnforcement || {}),
              },
              negativePrompt: {
                ...DEFAULT_TEMPLATE.negativePrompt,
                ...(loadedTemplate.negativePrompt || {}),
              },
            };
            // Normalize template to clean up any legacy empty customColors
            setTemplate(normalizeTemplateColors(mergedTemplate));
          }
          // Convert reference image paths to ImageReference array
          const images = (savedTemplate.referenceImages || []).map((path: string) => {
            return { id: crypto.randomUUID(), url: path };
          });
          setReferenceImages(images);
        } catch (e) {
          console.error("Failed to load saved template:", e);
          // Set default template with style label as name
          setTemplate(normalizeTemplateColors({
            ...DEFAULT_TEMPLATE,
            name: selectedStyle?.label || DEFAULT_TEMPLATE.name,
          }));
          setReferenceImages([]);
        }
      } else {
        // No saved template, use default and load local reference images
        setTemplate(normalizeTemplateColors({
          ...DEFAULT_TEMPLATE,
          name: selectedStyle?.label || DEFAULT_TEMPLATE.name,
        }));
        // Clear existing reference images first, then load local ones
        setReferenceImages([]);
        loadLocalReferenceImages(selectedStyleId);
      }
    }
  }, [selectedStyleId, styles, savedTemplate, templateLoading]);

  const loadLocalReferenceImages = async (styleId: string) => {
    setIsLoadingImages(true);
    try {
      const basePath = `/reference-images/${styleId}`;
      const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
      
      // Build all possible image paths
      const imagePaths: string[] = [];
      for (let i = 1; i <= 10; i++) {
        for (const ext of imageExtensions) {
          imagePaths.push(`${basePath}/${i}.${ext}`);
        }
      }
      
      // Check all paths in parallel with stricter validation
      const checkPromises = imagePaths.map(async (imagePath) => {
        try {
          const response = await fetch(imagePath, { method: 'HEAD' });
          
          // Strict validation: must be OK status, have image content type, and non-zero size
          if (!response.ok) {
            return null;
          }
          
          const contentType = response.headers.get('Content-Type');
          const contentLength = response.headers.get('Content-Length');
          
          // Verify it's actually an image with content
          const isImage = contentType && contentType.startsWith('image/');
          const hasContent = contentLength && parseInt(contentLength, 10) > 0;
          
          return (isImage && hasContent) ? imagePath : null;
        } catch {
          return null;
        }
      });
      
      // Wait for all checks to complete
      const results = await Promise.all(checkPromises);
      
      // Filter out null values and sort by filename
      const localImages = results
        .filter((path): path is string => path !== null)
        .sort((a, b) => {
          const numA = parseInt(a.match(/\/(\d+)\./)?.[1] || '0');
          const numB = parseInt(b.match(/\/(\d+)\./)?.[1] || '0');
          return numA - numB;
        });
      
      if (localImages.length > 0) {
        const imageRefs = localImages.map(url => ({
          id: crypto.randomUUID(),
          url
        }));
        setReferenceImages(imageRefs);
        console.log(`Loaded ${localImages.length} local reference images for ${styleId}`);
      }
    } catch (error) {
      console.error("Failed to load local reference images:", error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const generatePreview = useCallback(() => {
    // Get current style info for realistic preview
    const currentStyle = styles?.find(s => s.id === selectedStyleId);
    const styleLabel = currentStyle?.label || "Style Preset";
    const styleDescription = currentStyle?.description || "style description";
    const styleBasePrompt = currentStyle?.basePrompt || "style base prompt";
    
    // Example user prompt for preview
    const exampleUserPrompt = "{userPrompt}";
    
    // Check if this is a simple template using type guard
    if (isSimpleTemplate(template)) {
      const suffix = template.suffix || "white background, 8k resolution";
      const prompt = `${exampleUserPrompt}, ${styleBasePrompt}, ${suffix}`;
      setPreviewPrompt(prompt);
      return;
    }
    
    // Check if this is a universal template
    if (isUniversalTemplate(template)) {
      setPreviewPrompt(generateUniversalPreview(template, template.name || styleLabel));
      return;
    }
    
    // Structured template - TypeScript now knows template is StructuredTemplate
    const structuredTemplate = template as StructuredTemplate;
    let prompt = `PROMPT TEMPLATE\n\n[SCENE — ${exampleUserPrompt}]\n\n`;

    if (structuredTemplate.cameraComposition.enabled) {
      prompt += "1. CAMERA & COMPOSITION\n";
      prompt += `- Camera angle: ${structuredTemplate.cameraComposition.cameraAngle}\n`;
      prompt += `- Composition layout: ${structuredTemplate.cameraComposition.compositionLayout} (${styleLabel} inspiration)\n`;
      prompt += `- Framing: ${structuredTemplate.cameraComposition.framing}\n`;
      prompt += `- Depth arrangement: ${structuredTemplate.cameraComposition.depthArrangement}\n\n`;
    }

    if (structuredTemplate.environment.enabled) {
      prompt += "2. ENVIRONMENT\n";
      const setting = structuredTemplate.environment.setting.replace("[Scene description]", exampleUserPrompt);
      prompt += `- Setting: ${setting}\n`;
      prompt += `- Lighting: ${structuredTemplate.environment.lighting}\n`;
      const atmosphere = structuredTemplate.environment.atmosphere.replace("match style tone", `match ${styleLabel} (${styleDescription}) tone`);
      prompt += `- Atmosphere: ${atmosphere}\n`;
      prompt += `- Background complexity: ${structuredTemplate.environment.backgroundComplexity}\n\n`;
    }

    if (structuredTemplate.mainCharacter.enabled) {
      prompt += "3. MAIN CHARACTER\n";
      prompt += `- Pose: ${structuredTemplate.mainCharacter.pose}\n`;
      prompt += `- Expression: ${structuredTemplate.mainCharacter.expression}\n`;
      prompt += `- Interaction: ${structuredTemplate.mainCharacter.interaction}\n`;
      const clothing = structuredTemplate.mainCharacter.clothing.replace("match character lock and respect style", `match character lock and respect ${styleBasePrompt}`);
      prompt += `- Clothing: ${clothing}\n\n`;
    }

    if (structuredTemplate.secondaryObjects.enabled) {
      prompt += "4. SECONDARY OBJECTS & ACTION\n";
      const objects = structuredTemplate.secondaryObjects.objects.replace("follow the same stylization rules as the style preset", `follow the same stylization rules as ${styleLabel}`);
      prompt += `- Objects: ${objects}\n`;
      prompt += `- Motion cues: ${structuredTemplate.secondaryObjects.motionCues}\n`;
      prompt += `- Scale rules: ${structuredTemplate.secondaryObjects.scaleRules}\n\n`;
    }

    if (structuredTemplate.styleEnforcement.enabled) {
      prompt += "5. STYLE ENFORCEMENT\n";
      prompt += `- Apply ${styleBasePrompt}\n`;
      prompt += `- ${structuredTemplate.styleEnforcement.styleRules}\n`;
      
      if (structuredTemplate.colorMode === "default") {
        // Explicit default mode: Do not specify colors, let AI learn from reference images
      } else if (structuredTemplate.customColors?.colors && structuredTemplate.customColors.colors.length > 0) {
        // Filter out colors with missing hex or name values
        const validColors = structuredTemplate.customColors.colors.filter(
          (color) => color.hex && color.name
        );
        if (validColors.length > 0) {
          prompt += "- Color palette:\n";
          validColors.forEach((color) => {
            const usage = color.role ? ` (primarily for ${color.role})` : '';
            prompt += `  • ${color.hex.toUpperCase()} ${color.name}${usage}\n`;
          });
          prompt += "  • Maintain consistent use of these colors throughout the image\n";
        }
      } else if (currentStyle?.defaultColors?.colors) {
        // Filter out colors with missing hex or name values
        const validColors = currentStyle.defaultColors.colors.filter(
          (color) => color.hex && color.name
        );
        if (validColors.length > 0) {
          prompt += "- Color palette:\n";
          validColors.forEach((color) => {
            const usage = color.role ? ` (primarily for ${color.role})` : '';
            prompt += `  • ${color.hex.toUpperCase()} ${color.name}${usage}\n`;
          });
          prompt += "  • Maintain consistent use of these colors throughout the image\n";
        }
      } else {
        prompt += `- Color palette: ${structuredTemplate.styleEnforcement.colorPalette}\n`;
      }
      
      prompt += `- Texture density: ${structuredTemplate.styleEnforcement.textureDensity}\n\n`;
    }

    if (structuredTemplate.negativePrompt.enabled) {
      prompt += "6. NEGATIVE PROMPT\n";
      prompt += structuredTemplate.negativePrompt.items;
    }

    setPreviewPrompt(prompt);
  }, [template, styles, selectedStyleId]);

  useEffect(() => {
    // Generate preview immediately on initial render
    if (isInitialRender.current) {
      isInitialRender.current = false;
      generatePreview();
      return;
    }

    // Debounce preview generation to avoid frequent updates
    const timeoutId = setTimeout(() => {
      generatePreview();
    }, 300); // 300ms delay for subsequent updates

    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(timeoutId);
  }, [generatePreview]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!selectedStyleId) {
      toast({
        title: "No style selected",
        description: "Please select a style before uploading images.",
        variant: "destructive",
      });
      return;
    }

    // File size validation: 10MB limit
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    const filesArray = Array.from(files);
    const oversizedFiles = filesArray.filter(file => file.size > MAX_FILE_SIZE);
    
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(", ");
      const fileSizeMB = (oversizedFiles[0].size / (1024 * 1024)).toFixed(2);
      toast({
        title: "File too large",
        description: `${oversizedFiles.length === 1 
          ? `${fileNames} (${fileSizeMB}MB) exceeds` 
          : `${oversizedFiles.length} files exceed`} the 10MB size limit. Please use smaller images.`,
        variant: "destructive",
      });
      
      // Filter out oversized files
      const validFiles = filesArray.filter(file => file.size <= MAX_FILE_SIZE);
      if (validFiles.length === 0) {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      
      // Show info about valid files being uploaded
      if (validFiles.length > 0) {
        toast({
          title: "Processing valid files",
          description: `Uploading ${validFiles.length} file(s) under 10MB limit.`,
        });
      }
    }

    const validFiles = filesArray.filter(file => file.size <= MAX_FILE_SIZE);
    const uploadPromises = validFiles.map(async (file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const imageBase64 = event.target?.result as string;
          
          try {
            // Upload to server
            const response = await fetch("/api/upload-reference-image", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                styleId: selectedStyleId,
                imageBase64,
                fileName: file.name,
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to upload image");
            }

            const result = await response.json();
            resolve(result.localPath); // Return local path like /reference-images/cyan_sketchline_vector/1.png
          } catch (error) {
            console.error("Upload error:", error);
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    try {
      const uploadedPaths = await Promise.all(uploadPromises);
      const newImageRefs = uploadedPaths.map(url => ({
        id: crypto.randomUUID(),
        url
      }));
      setReferenceImages((prev) => [...prev, ...newImageRefs]);
      
      toast({
        title: "Images uploaded",
        description: `Successfully uploaded ${uploadedPaths.length} image(s) to ${selectedStyleId}`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload one or more images",
        variant: "destructive",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setReferenceImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleDragStart = (imageId: string) => {
    setDraggedImageId(imageId);
  };

  const handleDragOver = (e: React.DragEvent, imageId: string) => {
    e.preventDefault();
    setDragOverImageId(imageId);
  };

  const handleDrop = (e: React.DragEvent, targetImageId: string) => {
    e.preventDefault();
    
    if (draggedImageId && draggedImageId !== targetImageId) {
      const draggedIndex = referenceImages.findIndex(img => img.id === draggedImageId);
      const targetIndex = referenceImages.findIndex(img => img.id === targetImageId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newImages = [...referenceImages];
        const [draggedImage] = newImages.splice(draggedIndex, 1);
        newImages.splice(targetIndex, 0, draggedImage);
        setReferenceImages(newImages);
      }
    }
    
    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  const handleDragEnd = () => {
    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  const handleTouchStart = (e: React.TouchEvent, imageId: string) => {
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchCurrentY.current = touch.clientY;
    touchStartTime.current = Date.now();
    isDraggingTouch.current = false;
    
    // Set a timeout for long press detection (500ms)
    setTimeout(() => {
      if (touchStartTime.current > 0 && !isDraggingTouch.current) {
        // Long press detected - start dragging
        isDraggingTouch.current = true;
        setDraggedImageId(imageId);
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent, imageId: string) => {
    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    
    // If moved more than 10px before long press, cancel drag intent
    if (!isDraggingTouch.current && deltaY > 10) {
      touchStartTime.current = 0;
      return;
    }
    
    // Only handle drag if long press was detected
    if (!isDraggingTouch.current || !draggedImageId) return;
    
    // Prevent default scrolling when dragging
    e.preventDefault();
    
    touchCurrentY.current = touch.clientY;
    
    // Determine which image is being hovered based on touch position
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const cardElement = elements.find(el => el.getAttribute('data-image-id'));
    
    if (cardElement) {
      const hoveredImageId = cardElement.getAttribute('data-image-id');
      if (hoveredImageId && hoveredImageId !== draggedImageId) {
        setDragOverImageId(hoveredImageId);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isDraggingTouch.current && draggedImageId && dragOverImageId && draggedImageId !== dragOverImageId) {
      const draggedIndex = referenceImages.findIndex(img => img.id === draggedImageId);
      const targetIndex = referenceImages.findIndex(img => img.id === dragOverImageId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newImages = [...referenceImages];
        const [draggedImage] = newImages.splice(draggedIndex, 1);
        newImages.splice(targetIndex, 0, draggedImage);
        setReferenceImages(newImages);
      }
    }
    
    setDraggedImageId(null);
    setDragOverImageId(null);
    touchStartY.current = 0;
    touchCurrentY.current = 0;
    touchStartTime.current = 0;
    isDraggingTouch.current = false;
  };

  // Mutation for saving template
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: { styleId: string; templateData: any; referenceImages: string[] }) => {
      return apiRequest("POST", `/api/templates/${data.styleId}`, {
        templateData: data.templateData,
        referenceImages: data.referenceImages,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", selectedStyleId] });
      const selectedStyle = styles?.find(s => s.id === selectedStyleId);
      toast({
        title: "Template saved",
        description: `Template for ${selectedStyle?.label || selectedStyleId} has been saved with ${referenceImages.length} reference images.`,
      });
    },
    onError: (error) => {
      console.error("Failed to save template:", error);
      toast({
        title: "Save failed",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!selectedStyleId) {
      toast({
        title: "No style selected",
        description: "Please select a style first.",
        variant: "destructive",
      });
      return;
    }
    
    // Only normalize colors for structured templates
    const templateDataToSave = isStructuredTemplate(template) 
      ? normalizeTemplateColors(template)
      : template;
    const referenceImagePaths = referenceImages.map(img => img.url);
    
    saveTemplateMutation.mutate({
      styleId: selectedStyleId,
      templateData: templateDataToSave,
      referenceImages: referenceImagePaths,
    });
  };

  const handleReset = () => {
    // Find the selected style to get its label
    const selectedStyle = styles?.find(s => s.id === selectedStyleId);
    
    // Reset to default template with style-specific name
    setTemplate({
      ...DEFAULT_TEMPLATE,
      name: selectedStyle?.label || DEFAULT_TEMPLATE.name,
    });
    
    toast({
      title: "Template reset",
      description: "Template has been reset to default values.",
    });
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewPrompt);
    toast({
      title: "Copied to clipboard",
      description: "Preview prompt has been copied to clipboard.",
    });
  };

  // Show loading state while data is being fetched
  if (stylesLoading || (selectedStyleId && templateLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Prompt Template Editor</h1>
            <p className="text-muted-foreground mt-2">
              Customize prompt templates for each style preset (Admin Only)
            </p>
          </div>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading template...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Prompt Template Editor</h1>
          <p className="text-muted-foreground mt-2">
            Customize prompt templates for each style preset (Admin Only)
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <Palette className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <Label htmlFor="style-select" className="text-base font-semibold">
                Select Style to Edit
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Each style can have its own custom template
              </p>
            </div>
            <Select
              value={selectedStyleId}
              onValueChange={setSelectedStyleId}
            >
              <SelectTrigger id="style-select" className="w-[280px]">
                <SelectValue placeholder={stylesLoading ? "Loading..." : "Select a style"} />
              </SelectTrigger>
              <SelectContent>
                {styles?.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor Panel */}
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={template.name}
                  onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                  placeholder="My Custom Template"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label>Reference Images (Priority Order)</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload and arrange reference images for this style preset
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  disabled={isLoadingImages}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Reference Images
                </Button>

                {isLoadingImages && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="p-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-5 flex-shrink-0" />
                          <Skeleton className="h-16 w-16 rounded flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <Skeleton className="h-4 w-20" />
                          </div>
                          <Skeleton className="h-8 w-8 flex-shrink-0" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {!isLoadingImages && referenceImages.length > 0 && (
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {referenceImages.map((image, index) => (
                        <motion.div
                          key={image.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.3 }}
                          layout
                        >
                          <Card
                            data-image-id={image.id}
                            draggable
                            onDragStart={() => handleDragStart(image.id)}
                            onDragOver={(e) => handleDragOver(e, image.id)}
                            onDrop={(e) => handleDrop(e, image.id)}
                            onDragEnd={handleDragEnd}
                            onTouchStart={(e) => handleTouchStart(e, image.id)}
                            onTouchMove={(e) => handleTouchMove(e, image.id)}
                            onTouchEnd={handleTouchEnd}
                            style={{ touchAction: 'pan-y' }}
                            className={`p-2 transition-all cursor-move ${
                              draggedImageId === image.id ? "opacity-50" : ""
                            } ${
                              dragOverImageId === image.id && draggedImageId !== image.id
                                ? "border-primary bg-accent/50"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex-shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing">
                                <GripVertical className="h-5 w-5" />
                              </div>
                              <div 
                                className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-muted cursor-pointer group relative"
                                onClick={() => setPreviewImageUrl(image.url)}
                              >
                                <ImageWithFallback
                                  src={image.url}
                                  alt={`Reference ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  fallbackText="Load failed"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Maximize2 className="h-6 w-6 text-white" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground truncate">
                                  Priority #{index + 1}
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveImage(image.id)}
                                className="h-8 w-8 flex-shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <p className="text-xs text-muted-foreground">
                      Drag and drop to reorder. Click image to preview. Higher priority images are used first during generation.
                    </p>
                  </div>
                )}

                {!isLoadingImages && referenceImages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="p-8 border-dashed">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-12 h-12 mb-2 opacity-40" />
                        <p className="text-sm">No reference images uploaded</p>
                        <p className="text-xs mt-1">Click the button above to add images</p>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </div>

              <Separator />

              {/* Simple Template UI - only show suffix editor */}
              {isSimpleTemplate(template) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-md">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Simple Concatenation Template</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This template uses a simple format: <code className="bg-muted px-1 py-0.5 rounded">{"{scene}, {style}, {suffix}"}</code>
                  </p>
                  <div>
                    <Label>Suffix Keywords</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Added at the end of the prompt (e.g., "white background, 8k resolution")
                    </p>
                    <Input
                      value={template.suffix || "white background, 8k resolution"}
                      onChange={(e) => setTemplate({ ...template, suffix: e.target.value })}
                      placeholder="white background, 8k resolution"
                    />
                  </div>
                </div>
              )}

              {/* Universal Template UI (V2) - simplified admin editor */}
              {isUniversalTemplate(template) && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-md">
                    <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium">Universal Template (V2)</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Simplified prompt structure: [SCENE] + [FRAMING] + [STYLE] + [COLORS] + [RULES] + [NEGATIVE]
                  </p>

                  {/* Style Keywords */}
                  <div>
                    <Label>Style Keywords</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      10-20 descriptive words defining the visual style
                    </p>
                    <Textarea
                      value={template.styleKeywords}
                      onChange={(e) => setTemplate({ ...template, styleKeywords: e.target.value })}
                      placeholder="simple clean line art, flat 2D shapes, thin outlines, minimal shading, vector style"
                      rows={3}
                    />
                  </div>

                  {/* Default Color Palette */}
                  <div>
                    <Label>Default Color Palette</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      HEX colors separated by commas (e.g., #00AEEF, #E6F7FF, #003B73)
                    </p>
                    <Input
                      value={(template.defaultPalette || []).join(", ")}
                      onChange={(e) => {
                        const colors = e.target.value
                          .split(",")
                          .map(c => c.trim())
                          .filter(c => c.length > 0);
                        setTemplate({ ...template, defaultPalette: colors });
                      }}
                      placeholder="#00AEEF, #E6F7FF, #003B73, #FFFFFF"
                    />
                    {/* Color preview swatches */}
                    {template.defaultPalette && template.defaultPalette.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {template.defaultPalette.map((color, idx) => (
                          <div
                            key={idx}
                            className="w-8 h-8 rounded-md border border-border"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Universal Rules */}
                  <div>
                    <Label>Universal Rules</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Drawing rules that apply to all generations
                    </p>
                    <Textarea
                      value={template.rules}
                      onChange={(e) => setTemplate({ ...template, rules: e.target.value })}
                      placeholder="Consistent proportions, natural posture, correct scale, clean minimal background, no text, no watermark."
                      rows={3}
                    />
                  </div>

                  {/* Negative Prompt */}
                  <div>
                    <Label>Negative Prompt</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Keywords to avoid in generation
                    </p>
                    <Textarea
                      value={template.negativePrompt}
                      onChange={(e) => setTemplate({ ...template, negativePrompt: e.target.value })}
                      placeholder="bad proportions, distorted limbs, extra faces, blurry, noisy, cluttered background"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Structured Template UI - show full tabs */}
              {isStructuredTemplate(template) && (
              <Tabs defaultValue="camera" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                  <TabsTrigger value="camera" className="text-xs sm:text-sm">Camera</TabsTrigger>
                  <TabsTrigger value="environment" className="text-xs sm:text-sm">Environment</TabsTrigger>
                  <TabsTrigger value="character" className="text-xs sm:text-sm">Character</TabsTrigger>
                  <TabsTrigger value="colors" className="text-xs sm:text-sm">
                    <Palette className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Colors
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="camera" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="camera-enabled">Enable Camera & Composition</Label>
                    <Switch
                      id="camera-enabled"
                      checked={template.cameraComposition.enabled}
                      onCheckedChange={(checked) =>
                        setTemplate({
                          ...template,
                          cameraComposition: { ...template.cameraComposition, enabled: checked },
                        })
                      }
                    />
                  </div>

                  {template.cameraComposition.enabled && (
                    <>
                      <div>
                        <Label>Camera Angle</Label>
                        <Textarea
                          value={template.cameraComposition.cameraAngle}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              cameraComposition: {
                                ...template.cameraComposition,
                                cameraAngle: e.target.value,
                              },
                            })
                          }
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>Composition Layout</Label>
                        <Input
                          value={template.cameraComposition.compositionLayout}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              cameraComposition: {
                                ...template.cameraComposition,
                                compositionLayout: e.target.value,
                              },
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Framing</Label>
                        <Textarea
                          value={template.cameraComposition.framing}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              cameraComposition: {
                                ...template.cameraComposition,
                                framing: e.target.value,
                              },
                            })
                          }
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>Depth Arrangement</Label>
                        <Textarea
                          value={template.cameraComposition.depthArrangement}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              cameraComposition: {
                                ...template.cameraComposition,
                                depthArrangement: e.target.value,
                              },
                            })
                          }
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="environment" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="env-enabled">Enable Environment</Label>
                    <Switch
                      id="env-enabled"
                      checked={template.environment.enabled}
                      onCheckedChange={(checked) =>
                        setTemplate({
                          ...template,
                          environment: { ...template.environment, enabled: checked },
                        })
                      }
                    />
                  </div>

                  {template.environment.enabled && (
                    <>
                      <div>
                        <Label>Setting</Label>
                        <Input
                          value={template.environment.setting}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              environment: { ...template.environment, setting: e.target.value },
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Lighting</Label>
                        <Input
                          value={template.environment.lighting}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              environment: { ...template.environment, lighting: e.target.value },
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Atmosphere</Label>
                        <Input
                          value={template.environment.atmosphere}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              environment: { ...template.environment, atmosphere: e.target.value },
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Background Complexity</Label>
                        <Textarea
                          value={template.environment.backgroundComplexity}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              environment: {
                                ...template.environment,
                                backgroundComplexity: e.target.value,
                              },
                            })
                          }
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="character" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="char-enabled">Enable Main Character</Label>
                    <Switch
                      id="char-enabled"
                      checked={template.mainCharacter.enabled}
                      onCheckedChange={(checked) =>
                        setTemplate({
                          ...template,
                          mainCharacter: { ...template.mainCharacter, enabled: checked },
                        })
                      }
                    />
                  </div>

                  {template.mainCharacter.enabled && (
                    <>
                      <div>
                        <Label>Pose</Label>
                        <Textarea
                          value={template.mainCharacter.pose}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              mainCharacter: { ...template.mainCharacter, pose: e.target.value },
                            })
                          }
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>Expression</Label>
                        <Textarea
                          value={template.mainCharacter.expression}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              mainCharacter: {
                                ...template.mainCharacter,
                                expression: e.target.value,
                              },
                            })
                          }
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>Interaction</Label>
                        <Textarea
                          value={template.mainCharacter.interaction}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              mainCharacter: {
                                ...template.mainCharacter,
                                interaction: e.target.value,
                              },
                            })
                          }
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>Clothing</Label>
                        <Textarea
                          value={template.mainCharacter.clothing}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              mainCharacter: { ...template.mainCharacter, clothing: e.target.value },
                            })
                          }
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="colors" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Color Mode</Label>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="color-mode-default"
                            name="color-mode"
                            value="default"
                            checked={template.colorMode === "default" || !template.colorMode}
                            onChange={(e) =>
                              setTemplate({
                                ...template,
                                colorMode: "default",
                              })
                            }
                            data-testid="radio-color-mode-default"
                          />
                          <Label htmlFor="color-mode-default" className="font-normal cursor-pointer">
                            Use style default colors
                            {styles?.find(s => s.id === selectedStyleId)?.defaultColors && (
                              <span className="text-muted-foreground text-sm ml-2">
                                ({styles.find(s => s.id === selectedStyleId)?.defaultColors?.colors.length || 0} colors)
                              </span>
                            )}
                          </Label>
                        </div>
                        
                        {styles?.find(s => s.id === selectedStyleId)?.defaultColors && (
                          <div className="ml-6 flex flex-wrap gap-2">
                            {styles.find(s => s.id === selectedStyleId)?.defaultColors?.colors.map((color, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <div
                                  className="w-6 h-6 rounded border"
                                  style={{ backgroundColor: color.hex }}
                                  title={`${color.name} (${color.hex})`}
                                />
                                <span className="text-muted-foreground">{color.name}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="color-mode-custom"
                            name="color-mode"
                            value="custom"
                            checked={template.colorMode === "custom"}
                            onChange={(e) =>
                              setTemplate({
                                ...template,
                                colorMode: "custom",
                                customColors: template.customColors || { colors: [] },
                              })
                            }
                            data-testid="radio-color-mode-custom"
                          />
                          <Label htmlFor="color-mode-custom" className="font-normal cursor-pointer">
                            Use custom color palette
                          </Label>
                        </div>
                      </div>
                    </div>

                    {template.colorMode === "custom" && (
                      <div className="space-y-4 pl-6">
                        <ColorPaletteManager
                          colors={template.customColors?.colors || []}
                          onColorsChange={(colors) => {
                            const updatedTemplate = {
                              ...template,
                              customColors: { ...template.customColors, colors },
                            };
                            setTemplate(normalizeTemplateColors(updatedTemplate));
                          }}
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              )}

              {/* Negative Prompt - only for structured templates */}
              {isStructuredTemplate(template) && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="negative-enabled">Enable Negative Prompt</Label>
                      <Switch
                        id="negative-enabled"
                        checked={template.negativePrompt.enabled}
                        onCheckedChange={(checked) =>
                          setTemplate({
                            ...template,
                            negativePrompt: { ...template.negativePrompt, enabled: checked },
                          })
                        }
                      />
                    </div>

                    {template.negativePrompt.enabled && (
                      <div>
                        <Label>Negative Prompt Items</Label>
                        <Textarea
                          value={template.negativePrompt.items}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              negativePrompt: { ...template.negativePrompt, items: e.target.value },
                            })
                          }
                          rows={8}
                          className="font-mono text-sm"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleSave} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
                <Button onClick={handleReset} variant="outline" className="sm:w-auto">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </Card>

          {/* Preview Panel */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Preview</h2>
                <Button onClick={handleCopyPreview} variant="outline" size="sm">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>

              <div className="bg-muted rounded-lg p-4 max-h-[400px] sm:max-h-[500px] lg:max-h-[calc(100vh-200px)] overflow-y-auto">
                <pre className="text-xs sm:text-sm whitespace-pre-wrap font-mono">{previewPrompt}</pre>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>
                  <strong>Note:</strong> The template will be applied when generating images. Use{" "}
                  <code>{"{userPrompt}"}</code> as a placeholder for the actual scene description.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={previewImageUrl !== null} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {previewImageUrl && (
            <div className="relative w-full">
              <ImageWithFallback
                src={previewImageUrl}
                alt="Preview"
                className="w-full h-auto rounded-lg"
                loading="lazy"
                fallbackText="Failed to load preview image"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

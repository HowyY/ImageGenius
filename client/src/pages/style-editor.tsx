import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Save,
  Copy,
  RotateCcw,
  Upload,
  X,
  GripVertical,
  Image as ImageIcon,
  Maximize2,
  Sparkles,
  Plus,
  Trash2,
  ClipboardCopy,
  Search,
  Loader2,
  Play,
  ChevronRight,
  Menu,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StylePreset, Color, SelectCharacter, CharacterCard, AvatarCrop, AvatarProfile } from "@shared/schema";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { ColorPaletteManager } from "@/components/ColorPaletteManager";
import { normalizeTemplateColors } from "@/lib/templateUtils";
import { useCharacters, CHARACTERS_QUERY_KEY } from "@/hooks/use-characters";
import { CroppedAvatar } from "@/components/AvatarCropDialog";
import { User, Check } from "lucide-react";

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
  paletteMode?: "loose" | "strict";
  loosePalette?: string;
  strictPalette?: string[];
  defaultPalette?: string[];
  rules: string;
  negativePrompt: string;
  referenceImages?: ImageReference[];
}

interface CinematicTemplate {
  name: string;
  templateType: "cinematic";
  sceneAction: string;
  cameraFraming: string;
  visualAnchors: string;
  colorRender: string;
  technicalSpecs: string;
  negativePrompt: string;
  referenceImages?: ImageReference[];
}

type PromptTemplate = StructuredTemplate | SimpleTemplate | UniversalTemplate | CinematicTemplate;

function isSimpleTemplate(template: PromptTemplate): template is SimpleTemplate {
  return (template as SimpleTemplate).templateType === "simple";
}

function isUniversalTemplate(template: PromptTemplate): template is UniversalTemplate {
  return (template as UniversalTemplate).templateType === "universal";
}

function isCinematicTemplate(template: PromptTemplate): template is CinematicTemplate {
  return (template as CinematicTemplate).templateType === "cinematic";
}

function isStructuredTemplate(template: PromptTemplate): template is StructuredTemplate {
  return !isSimpleTemplate(template) && !isUniversalTemplate(template) && !isCinematicTemplate(template);
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

const DEFAULT_CINEMATIC_TEMPLATE: CinematicTemplate = {
  name: "Default Cinematic Template",
  templateType: "cinematic",
  sceneAction: "{userPrompt}",
  cameraFraming: "medium shot:1.2, balanced composition, subtle depth of field:0.8",
  visualAnchors: "main subject clearly defined, secondary elements support the narrative",
  colorRender: "cinematic color grading:1.1, natural lighting, film grain:0.3",
  technicalSpecs: "8K resolution, photorealistic quality, professional cinematography",
  negativePrompt: "blurry, low quality, distorted anatomy, inconsistent lighting, amateur composition",
};

interface ExtendedStylePreset extends StylePreset {
  isBuiltIn?: boolean;
  isHidden?: boolean;
  displayOrder?: number;
  referenceImageUrl?: string;
}

function StyleThumbnail({ src, label }: { src?: string; label: string }) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    setHasError(false);
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [src]);
  
  const firstLetter = label.charAt(0).toUpperCase();
  
  if (!src || hasError) {
    return (
      <div className="w-12 h-12 rounded-md overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 flex items-center justify-center" data-testid="thumb-fallback">
        <span className="text-lg font-semibold text-primary/60">{firstLetter}</span>
      </div>
    );
  }
  
  return (
    <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0 relative" data-testid="thumb-container">
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <span className="text-lg font-semibold text-primary/60">{firstLetter}</span>
        </div>
      )}
      <img
        ref={imgRef}
        src={src}
        alt={label}
        className={`w-full h-full object-cover transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        data-testid="thumb-image"
      />
    </div>
  );
}

export default function StyleEditor() {
  const [, navigate] = useLocation();
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [template, setTemplate] = useState<PromptTemplate>(DEFAULT_TEMPLATE);
  const [previewPrompt, setPreviewPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<ImageReference[]>([]);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [testPrompt, setTestPrompt] = useState("A girl running in the park on a sunny day");
  const [testEngine, setTestEngine] = useState<string>("nanobanana");
  const [activeTab, setActiveTab] = useState("template");
  const [testResultUrl, setTestResultUrl] = useState<string | null>(null);
  // Store multiple selected character references with cardId for reliable tracking
  const [selectedCharacterRefs, setSelectedCharacterRefs] = useState<{
    cardId: string;
    imageUrl: string;
    characterName: string;
    visualPrompt?: string;
  }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const testPromptRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const { data: styles, isLoading: stylesLoading } = useQuery<ExtendedStylePreset[]>({
    queryKey: ["/api/styles", { includeHidden: true }],
    queryFn: async () => {
      const response = await fetch("/api/styles?includeHidden=1");
      if (!response.ok) throw new Error("Failed to fetch styles");
      return response.json();
    },
  });

  const { data: characters } = useCharacters();

  // Fetch all templates to get displayOrder
  interface TemplateWithOrder {
    id: number;
    styleId: string;
    displayOrder: number;
  }
  const { data: allTemplates } = useQuery<TemplateWithOrder[]>({
    queryKey: ["/api/templates"],
  });

  // Build a map of styleId -> displayOrder
  const templateOrderMap = useMemo(() => {
    const map: Record<string, number> = {};
    allTemplates?.forEach((t, index) => {
      map[t.styleId] = t.displayOrder ?? index;
    });
    return map;
  }, [allTemplates]);

  // Sort styles by displayOrder (templates with lower order first)
  const sortedStyles = useMemo(() => {
    if (!styles) return [];
    return [...styles].sort((a, b) => {
      const orderA = templateOrderMap[a.id] ?? 9999;
      const orderB = templateOrderMap[b.id] ?? 9999;
      return orderA - orderB;
    });
  }, [styles, templateOrderMap]);

  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showNewStyleDialog, setShowNewStyleDialog] = useState(false);
  const [showMobileStylesPanel, setShowMobileStylesPanel] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameStyleId, setRenameStyleId] = useState<string | null>(null);
  const [renameNewLabel, setRenameNewLabel] = useState("");
  const [cloneNewLabel, setCloneNewLabel] = useState("");
  const [newStyleLabel, setNewStyleLabel] = useState("");
  const [newStyleDescription, setNewStyleDescription] = useState("");

  const selectedStyle = styles?.find(s => s.id === selectedStyleId);
  const isBuiltInStyle = selectedStyle?.isBuiltIn !== false;

  const filteredStyles = sortedStyles.filter(s => 
    s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cloneStyleMutation = useMutation({
    mutationFn: async ({ sourceId, newLabel }: { sourceId: string; newLabel: string }) => {
      const newId = newLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const response = await apiRequest("POST", `/api/styles/${sourceId}/clone`, {
        newId,
        newLabel,
      });
      return await response.json() as ExtendedStylePreset;
    },
    onSuccess: async (result) => {
      setSelectedStyleId(result.id);
      setShowCloneDialog(false);
      setCloneNewLabel("");
      await queryClient.invalidateQueries({ queryKey: ["/api/styles"] });
      toast({
        title: "Style cloned",
        description: "New style created successfully. You can now modify it.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Clone failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteStyleMutation = useMutation({
    mutationFn: async (styleId: string) => {
      await apiRequest("DELETE", `/api/styles/${styleId}`);
      return styleId;
    },
    onSuccess: async (deletedStyleId) => {
      const nextStyle = styles?.find(s => s.id !== deletedStyleId);
      const nextStyleId = nextStyle?.id || "";
      
      setShowDeleteDialog(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/styles"] });
      
      if (nextStyleId) {
        setSelectedStyleId(nextStyleId);
      }
      
      toast({
        title: "Style deleted",
        description: "The style has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ styleId, isHidden }: { styleId: string; isHidden: boolean }) => {
      const response = await apiRequest("PATCH", `/api/styles/${styleId}`, { isHidden });
      return response.json() as Promise<ExtendedStylePreset>;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/styles"] });
      toast({
        title: result.isHidden ? "Style hidden" : "Style visible",
        description: result.isHidden 
          ? "This style is now hidden from user-facing views." 
          : "This style is now visible to all users.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renameStyleMutation = useMutation({
    mutationFn: async ({ styleId, label }: { styleId: string; label: string }) => {
      const response = await apiRequest("PATCH", `/api/styles/${styleId}`, { label });
      return response.json() as Promise<ExtendedStylePreset>;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/styles"] });
      setShowRenameDialog(false);
      setRenameStyleId(null);
      setRenameNewLabel("");
      toast({
        title: "Style renamed",
        description: `Style renamed to "${result.label}".`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Rename failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createStyleMutation = useMutation({
    mutationFn: async ({ label, description }: { label: string; description: string }) => {
      const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const response = await apiRequest("POST", "/api/styles", {
        id,
        label,
        description,
        engines: ["nanobanana", "seedream", "nanopro"],
        basePrompt: "clean vector art style",
        referenceImageUrl: "https://file.aiquickdraw.com/custom-page/akr/section-images/1756223420389w8xa2jfe.png",
      });
      return await response.json() as ExtendedStylePreset;
    },
    onSuccess: async (result) => {
      setSelectedStyleId(result.id);
      setShowNewStyleDialog(false);
      setNewStyleLabel("");
      setNewStyleDescription("");
      await queryClient.invalidateQueries({ queryKey: ["/api/styles"] });
      toast({
        title: "Style created",
        description: "New style created successfully. Configure its template now.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const generateMutation = useMutation({
    mutationFn: async (data: { prompt: string; styleId: string; engine: string; userReferenceImages?: string[] }) => {
      const response = await apiRequest("POST", "/api/generate", data);
      return await response.json();
    },
    onSuccess: (result) => {
      if (result?.imageUrl) {
        setTestResultUrl(result.imageUrl);
      }
      toast({
        title: "Test image generated",
        description: "Image generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderTemplatesMutation = useMutation({
    mutationFn: async (templateOrders: { styleId: string; displayOrder: number }[]) => {
      await apiRequest("POST", "/api/templates/reorder", { templateOrders });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Reorder failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMoveStyle = (styleId: string, direction: "up" | "down") => {
    const currentIndex = sortedStyles.findIndex(s => s.id === styleId);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedStyles.length) return;

    // Create new order
    const newOrder = [...sortedStyles];
    [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];
    
    // Build templateOrders array
    const templateOrders = newOrder.map((s, index) => ({
      styleId: s.id,
      displayOrder: index,
    }));

    reorderTemplatesMutation.mutate(templateOrders);
  };

  useEffect(() => {
    if (styles && styles.length > 0 && !selectedStyleId) {
      setSelectedStyleId(styles[0].id);
    }
  }, [styles, selectedStyleId]);

  useEffect(() => {
    if (selectedStyle?.engines && selectedStyle.engines.length > 0) {
      if (!selectedStyle.engines.includes(testEngine)) {
        setTestEngine(selectedStyle.engines[0]);
      }
    }
  }, [selectedStyleId, selectedStyle?.engines, testEngine]);

  // Reset character card selection when style changes
  useEffect(() => {
    setSelectedCharacterRefs([]);
  }, [selectedStyleId]);

  const generateSimplePreview = (simpleTemplate: SimpleTemplate, basePrompt: string) => {
    const suffix = simpleTemplate.suffix || "white background, 8k resolution";
    return `{userPrompt}, ${basePrompt}, ${suffix}`;
  };

  const generateUniversalPreview = (universalTemplate: UniversalTemplate, styleName: string) => {
    const styleKeywords = universalTemplate.styleKeywords || "";
    const rules = universalTemplate.rules || "";
    const negativePrompt = universalTemplate.negativePrompt || "";
    const paletteMode = universalTemplate.paletteMode || "loose";
    
    let prompt = `[SCENE]
{userPrompt}

[FRAMING]
Medium shot, balanced composition

[STYLE]
In ${styleName} style:
${styleKeywords}`;

    if (paletteMode === "loose" && universalTemplate.loosePalette) {
      prompt += `

[COLORS]
${universalTemplate.loosePalette}`;
    } else {
      const palette = universalTemplate.strictPalette || universalTemplate.defaultPalette || [];
      if (palette.length > 0) {
        const paletteColors = palette.join(", ");
        prompt += `

[COLORS]
Use the following palette:
${paletteColors}.
Follow the palette's saturation and contrast.`;
      }
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

  const generateCinematicPreview = (cinematicTemplate: CinematicTemplate) => {
    const sceneAction = cinematicTemplate.sceneAction || "{userPrompt}";
    const cameraFraming = cinematicTemplate.cameraFraming || "";
    const visualAnchors = cinematicTemplate.visualAnchors || "";
    const colorRender = cinematicTemplate.colorRender || "";
    const technicalSpecs = cinematicTemplate.technicalSpecs || "";
    const negativePrompt = cinematicTemplate.negativePrompt || "";

    let prompt = `[SCENE ACTION]
${sceneAction}`;

    if (cameraFraming) {
      prompt += `

[CAMERA & FRAMING]
${cameraFraming}`;
    }

    if (visualAnchors) {
      prompt += `

[VISUAL ANCHORS]
${visualAnchors}`;
    }

    if (colorRender) {
      prompt += `

[COLOR & RENDER]
${colorRender}`;
    }

    if (technicalSpecs) {
      prompt += `

[TECHNICAL SPECS]
${technicalSpecs}`;
    }

    if (negativePrompt) {
      prompt += `

[NEGATIVE]
${negativePrompt}`;
    }

    return prompt;
  };

  const generateStructuredPreview = useCallback((structuredTemplate: StructuredTemplate, basePrompt: string, styleName: string) => {
    let promptParts: string[] = [];

    if (structuredTemplate.cameraComposition.enabled) {
      promptParts.push(`Camera: ${structuredTemplate.cameraComposition.cameraAngle}, ${structuredTemplate.cameraComposition.compositionLayout}`);
    }

    if (structuredTemplate.environment.enabled) {
      promptParts.push(`Environment: ${structuredTemplate.environment.setting}, ${structuredTemplate.environment.lighting}`);
    }

    if (structuredTemplate.mainCharacter.enabled) {
      promptParts.push(`Character: ${structuredTemplate.mainCharacter.pose}, ${structuredTemplate.mainCharacter.expression}`);
    }

    if (structuredTemplate.styleEnforcement.enabled) {
      promptParts.push(`Style: ${basePrompt}, ${structuredTemplate.styleEnforcement.styleRules}`);
    }

    if (structuredTemplate.negativePrompt.enabled) {
      promptParts.push(`\nNegative: ${structuredTemplate.negativePrompt.items}`);
    }

    return promptParts.join("\n\n");
  }, []);

  useEffect(() => {
    if (selectedStyleId && styles && !templateLoading) {
      const selectedStyle = styles.find(s => s.id === selectedStyleId);
      
      if (savedTemplate && savedTemplate.templateData) {
        try {
          const loadedTemplate = savedTemplate.templateData;
          
          if (loadedTemplate.templateType === "simple") {
            setTemplate(loadedTemplate);
            const basePrompt = selectedStyle?.basePrompt || "style base prompt";
            setPreviewPrompt(generateSimplePreview(loadedTemplate as SimpleTemplate, basePrompt));
          } else if (loadedTemplate.templateType === "universal") {
            let normalizedTemplate = { ...loadedTemplate };
            
            if (!normalizedTemplate.paletteMode) {
              if (normalizedTemplate.defaultPalette && normalizedTemplate.defaultPalette.length > 0) {
                normalizedTemplate.paletteMode = "strict";
                normalizedTemplate.strictPalette = normalizedTemplate.defaultPalette;
              } else if (normalizedTemplate.loosePalette) {
                normalizedTemplate.paletteMode = "loose";
              } else {
                normalizedTemplate.paletteMode = "loose";
              }
            }
            
            setTemplate(normalizedTemplate);
            const styleName = normalizedTemplate.name || selectedStyle?.label || "Style";
            setPreviewPrompt(generateUniversalPreview(normalizedTemplate as UniversalTemplate, styleName));
          } else if (loadedTemplate.templateType === "cinematic") {
            const mergedCinematic = {
              ...DEFAULT_CINEMATIC_TEMPLATE,
              ...loadedTemplate,
            };
            setTemplate(mergedCinematic);
            setPreviewPrompt(generateCinematicPreview(mergedCinematic as CinematicTemplate));
          } else {
            const mergedTemplate = {
              ...DEFAULT_TEMPLATE,
              ...loadedTemplate,
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
            setTemplate(normalizeTemplateColors(mergedTemplate));
            setPreviewPrompt(generateStructuredPreview(mergedTemplate, selectedStyle?.basePrompt || "", selectedStyle?.label || ""));
          }
          const images = (savedTemplate.referenceImages || []).map((path: string) => {
            return { id: crypto.randomUUID(), url: path };
          });
          setReferenceImages(images);
        } catch (e) {
          console.error("Failed to load saved template:", e);
          setTemplate(normalizeTemplateColors({
            ...DEFAULT_TEMPLATE,
            name: selectedStyle?.label || DEFAULT_TEMPLATE.name,
          }));
          setReferenceImages([]);
        }
      } else {
        setTemplate(normalizeTemplateColors({
          ...DEFAULT_TEMPLATE,
          name: selectedStyle?.label || DEFAULT_TEMPLATE.name,
        }));
        setReferenceImages([]);
      }
    }
  }, [selectedStyleId, savedTemplate, styles, templateLoading, generateStructuredPreview]);

  useEffect(() => {
    if (!selectedStyleId || !styles) return;
    const selectedStyle = styles.find(s => s.id === selectedStyleId);
    if (!selectedStyle) return;

    if (isSimpleTemplate(template)) {
      setPreviewPrompt(generateSimplePreview(template, selectedStyle.basePrompt || ""));
    } else if (isUniversalTemplate(template)) {
      setPreviewPrompt(generateUniversalPreview(template, template.name || selectedStyle.label));
    } else if (isCinematicTemplate(template)) {
      setPreviewPrompt(generateCinematicPreview(template));
    } else if (isStructuredTemplate(template)) {
      setPreviewPrompt(generateStructuredPreview(template, selectedStyle.basePrompt || "", selectedStyle.label));
    }
  }, [template, selectedStyleId, styles, generateStructuredPreview]);

  const handleSave = async () => {
    if (!selectedStyleId) return;

    try {
      const templateToSave = isStructuredTemplate(template)
        ? normalizeTemplateColors(template)
        : template;
      
      const referenceImagePaths = referenceImages.map(img => img.url);
      
      await apiRequest("POST", `/api/templates/${selectedStyleId}`, {
        templateData: templateToSave,
        referenceImages: referenceImagePaths,
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/templates", selectedStyleId] });

      toast({
        title: "Template saved",
        description: "Your template has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    if (!selectedStyle) return;
    
    const templateName = selectedStyle.label || "Default";
    
    if (isCinematicTemplate(template)) {
      setTemplate({
        ...DEFAULT_CINEMATIC_TEMPLATE,
        name: templateName,
      });
    } else if (isSimpleTemplate(template)) {
      setTemplate({
        name: templateName,
        templateType: "simple",
        suffix: "white background, 8k resolution",
      });
    } else if (isUniversalTemplate(template)) {
      setTemplate({
        name: templateName,
        templateType: "universal",
        styleKeywords: "",
        paletteMode: "loose",
        loosePalette: "",
        rules: "",
        negativePrompt: "",
      });
    } else {
      setTemplate(normalizeTemplateColors({
        ...DEFAULT_TEMPLATE,
        name: templateName,
      }));
    }
    
    toast({
      title: "Template reset",
      description: "Template has been reset to defaults.",
    });
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewPrompt);
    toast({
      title: "Copied",
      description: "Preview prompt copied to clipboard.",
    });
  };

  const handleTestGenerate = () => {
    if (!selectedStyleId || !testPrompt.trim()) return;
    
    let finalPrompt = testPrompt;
    
    // When multiple characters are selected, prepend character-to-reference mapping
    if (selectedCharacterRefs.length > 1) {
      const characterMappings = selectedCharacterRefs.map((ref, index) => {
        const desc = ref.visualPrompt 
          ? ` (${ref.visualPrompt})` 
          : '';
        return `Reference image ${index + 1} is ${ref.characterName}${desc}`;
      }).join('. ');
      
      finalPrompt = `${characterMappings}. ${testPrompt}`;
    }
    
    const payload: { prompt: string; styleId: string; engine: string; userReferenceImages?: string[] } = {
      prompt: finalPrompt,
      styleId: selectedStyleId,
      engine: testEngine,
    };
    
    // Include all selected character cards as user reference images
    if (selectedCharacterRefs.length > 0) {
      payload.userReferenceImages = selectedCharacterRefs.map(ref => ref.imageUrl);
    }
    
    generateMutation.mutate(payload);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedStyleId) return;

    setIsLoadingImages(true);
    const newImages: ImageReference[] = [];

    for (const file of Array.from(files)) {
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await apiRequest("POST", "/api/upload-reference-image", {
          styleId: selectedStyleId,
          imageBase64: base64,
          fileName: file.name,
        });

        const result = await response.json();
        if (result.success && result.localPath) {
          newImages.push({
            id: crypto.randomUUID(),
            url: result.localPath,
          });
        }
      } catch (error) {
        console.error("Failed to upload image:", error);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
      }
    }

    if (newImages.length > 0) {
      setReferenceImages(prev => [...prev, ...newImages]);
      toast({
        title: "Images uploaded",
        description: `${newImages.length} image(s) uploaded successfully.`,
      });
    }

    setIsLoadingImages(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    const imageToRemove = referenceImages.find(img => img.id === imageId);
    
    if (!imageToRemove) {
      return;
    }
    
    const imagePath = imageToRemove.url;
    const isLocalReferenceImage = imagePath.startsWith('/reference-images/') || imagePath.includes('/reference-images/');
    
    if (isLocalReferenceImage) {
      if (!selectedStyleId) {
        toast({
          title: "Cannot delete image",
          description: "No style selected. Please select a style first.",
          variant: "destructive",
        });
        return;
      }
      
      try {
        const response = await fetch('/api/delete-reference-image', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            styleId: selectedStyleId,
            imagePath: imagePath,
          }),
        });
        
        if (response.ok) {
          console.log(`✓ Deleted reference image file: ${imagePath}`);
          setReferenceImages(prev => prev.filter(img => img.id !== imageId));
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to delete reference image file:', errorData);
          toast({
            title: "Failed to delete image",
            description: errorData.message || "Could not delete the reference image file",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error deleting reference image file:', error);
        toast({
          title: "Delete failed",
          description: "Network error while deleting reference image",
          variant: "destructive",
        });
      }
    } else {
      setReferenceImages(prev => prev.filter(img => img.id !== imageId));
    }
  };

  const handleDragStart = (imageId: string) => {
    setDraggedImageId(imageId);
  };

  const handleDragOver = (e: React.DragEvent, imageId: string) => {
    e.preventDefault();
    setDragOverImageId(imageId);
  };

  const handleDrop = (targetId: string) => {
    if (!draggedImageId || draggedImageId === targetId) {
      setDraggedImageId(null);
      setDragOverImageId(null);
      return;
    }

    const newImages = [...referenceImages];
    const draggedIndex = newImages.findIndex(img => img.id === draggedImageId);
    const targetIndex = newImages.findIndex(img => img.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [draggedItem] = newImages.splice(draggedIndex, 1);
      newImages.splice(targetIndex, 0, draggedItem);
      setReferenceImages(newImages);
    }

    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  if (stylesLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4">
            <Skeleton className="hidden lg:block lg:col-span-3 h-[600px]" />
            <Skeleton className="lg:col-span-5 h-[400px] lg:h-[600px]" />
            <Skeleton className="lg:col-span-4 h-[400px] lg:h-[600px]" />
          </div>
        </div>
      </div>
    );
  }

  const StylesNavigatorContent = () => (
    <>
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search styles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-styles"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setShowNewStyleDialog(true)}
            className="flex-1"
            data-testid="button-new-style"
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCloneDialog(true)}
            disabled={!selectedStyleId}
            data-testid="button-clone-style"
          >
            <Copy className="w-4 h-4 mr-1" />
            Clone
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-visible">
        <div className="space-y-1">
          {stylesLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-2 rounded-md">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-md flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredStyles.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {searchQuery ? "No styles match your search" : "No styles available"}
            </div>
          ) : (
            filteredStyles.map((style, index) => (
              <div
                key={style.id}
                className={`group p-2 rounded-md transition-colors cursor-pointer ${
                  selectedStyleId === style.id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover-elevate"
                }`}
                onClick={() => {
                  setSelectedStyleId(style.id);
                  setShowMobileStylesPanel(false);
                }}
                data-testid={`style-item-${style.id}`}
              >
                <div className="flex items-start gap-1">
                  {/* Reorder buttons */}
                  <div className="flex flex-col relative z-[1000]">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4"
                      disabled={index === 0 || reorderTemplatesMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleMoveStyle(style.id, "up");
                      }}
                      data-testid={`button-move-up-${style.id}`}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4"
                      disabled={index === filteredStyles.length - 1 || reorderTemplatesMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleMoveStyle(style.id, "down");
                      }}
                      data-testid={`button-move-down-${style.id}`}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0">
                    <StyleThumbnail 
                      src={style.referenceImageUrl} 
                      label={style.label} 
                    />
                    {style.isHidden && (
                      <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center pointer-events-none">
                        <EyeOff className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm truncate">{style.label}</span>
                      {style.isHidden && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 flex-shrink-0 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-600">Hidden</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground truncate">{style.id}</p>
                      <Button 
                        size="sm"
                        variant="ghost"
                        className="flex-shrink-0 h-5 px-1.5 text-[10px] relative z-[1000]"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setRenameStyleId(style.id);
                          setRenameNewLabel(style.label);
                          setShowRenameDialog(true);
                        }}
                        title="Rename this style"
                        data-testid={`button-rename-${style.id}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm"
                        variant={style.isHidden ? "outline" : "ghost"}
                        className={`flex-shrink-0 h-5 px-1.5 text-[10px] relative z-[1000] ${style.isHidden ? "border-orange-400 text-orange-600 dark:text-orange-400" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleVisibilityMutation.mutate({ 
                            styleId: style.id, 
                            isHidden: !style.isHidden 
                          });
                        }}
                        disabled={toggleVisibilityMutation.isPending}
                        title={style.isHidden ? "Show this style to users" : "Hide this style from users"}
                        data-testid={`button-toggle-visibility-${style.id}`}
                      >
                        {style.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {selectedStyle && !isBuiltInStyle && (
        <div className="pt-3 mt-3 border-t">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="w-full"
            data-testid="button-delete-style"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Style
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Style Editor</h1>
            <p className="text-muted-foreground hidden sm:block">Create and manage visual styles for image generation</p>
          </div>
          
          {/* Mobile styles panel trigger */}
          <Sheet open={showMobileStylesPanel} onOpenChange={setShowMobileStylesPanel}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden" data-testid="button-mobile-styles">
                <Menu className="w-4 h-4 mr-2" />
                Styles
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-4 flex flex-col">
              <SheetHeader className="mb-4">
                <SheetTitle>Styles</SheetTitle>
              </SheetHeader>
              <StylesNavigatorContent />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4">
          {/* Left Panel - Styles Navigator (Hidden on mobile, shown on lg+) */}
          <div className="hidden lg:block lg:col-span-3">
            <Card className="p-4 h-[calc(100vh-180px)] flex flex-col">
              <StylesNavigatorContent />
            </Card>
          </div>

          {/* Center Panel - Editor Tabs */}
          <div className="lg:col-span-5">
            <Card className="p-4 min-h-[400px] lg:h-[calc(100vh-180px)] flex flex-col">
              {selectedStyle ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold">{selectedStyle.label}</h2>
                      <p className="text-sm text-muted-foreground">{selectedStyle.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave} data-testid="button-save-template">
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleReset}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <TabsList className="grid grid-cols-5 mb-4">
                      <TabsTrigger value="template">Template</TabsTrigger>
                      <TabsTrigger value="colors">Colors</TabsTrigger>
                      <TabsTrigger value="references">References</TabsTrigger>
                      <TabsTrigger value="characters">Characters</TabsTrigger>
                      <TabsTrigger value="meta">Meta</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="flex-1">
                      <TabsContent value="template" className="mt-0 space-y-4">
                        {templateLoading ? (
                          <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-32 w-full" />
                          </div>
                        ) : (
                          <>
                            <div>
                              <Label>Template Type</Label>
                              <Select
                                value={
                                  isSimpleTemplate(template) ? "simple" : 
                                  isUniversalTemplate(template) ? "universal" : 
                                  isCinematicTemplate(template) ? "cinematic" : 
                                  "structured"
                                }
                                onValueChange={(value) => {
                                  if (value === "simple") {
                                    setTemplate({
                                      name: template.name,
                                      templateType: "simple",
                                      suffix: "white background, 8k resolution",
                                    });
                                  } else if (value === "universal") {
                                    setTemplate({
                                      name: template.name,
                                      templateType: "universal",
                                      styleKeywords: "",
                                      paletteMode: "loose",
                                      loosePalette: "",
                                      rules: "",
                                      negativePrompt: "",
                                    });
                                  } else if (value === "cinematic") {
                                    setTemplate({
                                      ...DEFAULT_CINEMATIC_TEMPLATE,
                                      name: template.name,
                                    });
                                  } else {
                                    setTemplate({
                                      ...DEFAULT_TEMPLATE,
                                      name: template.name,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger data-testid="select-template-type">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="universal">Universal (V2)</SelectItem>
                                  <SelectItem value="simple">Simple</SelectItem>
                                  <SelectItem value="structured">Structured</SelectItem>
                                  <SelectItem value="cinematic">Cinematic (Weighted)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {isUniversalTemplate(template) && (
                              <div className="space-y-4">
                                <div>
                                  <Label>Style Keywords</Label>
                                  <Textarea
                                    value={template.styleKeywords}
                                    onChange={(e) => setTemplate({ ...template, styleKeywords: e.target.value })}
                                    placeholder="cyan sketchline vector style, deep-blue outline characters..."
                                    rows={4}
                                    className="font-mono text-sm"
                                    data-testid="textarea-style-keywords"
                                  />
                                </div>
                                <div>
                                  <Label>Rules</Label>
                                  <Textarea
                                    value={template.rules}
                                    onChange={(e) => setTemplate({ ...template, rules: e.target.value })}
                                    placeholder="Follow the visual style of the reference images exactly..."
                                    rows={4}
                                    className="font-mono text-sm"
                                    data-testid="textarea-rules"
                                  />
                                </div>
                                <div>
                                  <Label>Negative Prompt</Label>
                                  <Textarea
                                    value={template.negativePrompt}
                                    onChange={(e) => setTemplate({ ...template, negativePrompt: e.target.value })}
                                    placeholder="heavy shading, 3D effects, neon tones..."
                                    rows={3}
                                    className="font-mono text-sm"
                                    data-testid="textarea-negative-prompt"
                                  />
                                </div>
                              </div>
                            )}

                            {isSimpleTemplate(template) && (
                              <div>
                                <Label>Suffix</Label>
                                <Textarea
                                  value={template.suffix}
                                  onChange={(e) => setTemplate({ ...template, suffix: e.target.value })}
                                  placeholder="white background, 8k resolution"
                                  rows={3}
                                  className="font-mono text-sm"
                                  data-testid="textarea-suffix"
                                />
                              </div>
                            )}

                            {isCinematicTemplate(template) && (
                              <div className="space-y-4">
                                <div>
                                  <Label>Camera & Framing</Label>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Camera angle, shot type, composition. Use weights like :1.2 for emphasis.
                                  </p>
                                  <Textarea
                                    value={template.cameraFraming}
                                    onChange={(e) => setTemplate({ ...template, cameraFraming: e.target.value })}
                                    placeholder="medium shot:1.2, balanced composition, subtle depth of field:0.8"
                                    rows={2}
                                    className="font-mono text-sm"
                                    data-testid="textarea-camera-framing"
                                  />
                                </div>
                                <div>
                                  <Label>Visual Anchors</Label>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Key visual elements that define the scene. Use weights for priority.
                                  </p>
                                  <Textarea
                                    value={template.visualAnchors}
                                    onChange={(e) => setTemplate({ ...template, visualAnchors: e.target.value })}
                                    placeholder="main subject clearly defined, secondary elements support the narrative"
                                    rows={2}
                                    className="font-mono text-sm"
                                    data-testid="textarea-visual-anchors"
                                  />
                                </div>
                                <div>
                                  <Label>Color & Render</Label>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Color grading, lighting style, and rendering quality.
                                  </p>
                                  <Textarea
                                    value={template.colorRender}
                                    onChange={(e) => setTemplate({ ...template, colorRender: e.target.value })}
                                    placeholder="cinematic color grading:1.1, natural lighting, film grain:0.3"
                                    rows={2}
                                    className="font-mono text-sm"
                                    data-testid="textarea-color-render"
                                  />
                                </div>
                                <div>
                                  <Label>Technical Specs</Label>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Resolution, quality settings, and technical parameters.
                                  </p>
                                  <Textarea
                                    value={template.technicalSpecs}
                                    onChange={(e) => setTemplate({ ...template, technicalSpecs: e.target.value })}
                                    placeholder="8K resolution, photorealistic quality, professional cinematography"
                                    rows={2}
                                    className="font-mono text-sm"
                                    data-testid="textarea-technical-specs"
                                  />
                                </div>
                                <div>
                                  <Label>Negative Prompt</Label>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Elements to avoid in the generated image.
                                  </p>
                                  <Textarea
                                    value={template.negativePrompt}
                                    onChange={(e) => setTemplate({ ...template, negativePrompt: e.target.value })}
                                    placeholder="blurry, low quality, distorted anatomy..."
                                    rows={3}
                                    className="font-mono text-sm"
                                    data-testid="textarea-cinematic-negative"
                                  />
                                </div>
                              </div>
                            )}

                            {isStructuredTemplate(template) && (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <Label>Camera & Composition</Label>
                                  <Switch
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
                                  <Textarea
                                    value={template.cameraComposition.cameraAngle}
                                    onChange={(e) =>
                                      setTemplate({
                                        ...template,
                                        cameraComposition: { ...template.cameraComposition, cameraAngle: e.target.value },
                                      })
                                    }
                                    rows={2}
                                    className="font-mono text-sm"
                                  />
                                )}

                                <div className="flex items-center justify-between">
                                  <Label>Style Enforcement</Label>
                                  <Switch
                                    checked={template.styleEnforcement.enabled}
                                    onCheckedChange={(checked) =>
                                      setTemplate({
                                        ...template,
                                        styleEnforcement: { ...template.styleEnforcement, enabled: checked },
                                      })
                                    }
                                  />
                                </div>
                                {template.styleEnforcement.enabled && (
                                  <Textarea
                                    value={template.styleEnforcement.styleRules}
                                    onChange={(e) =>
                                      setTemplate({
                                        ...template,
                                        styleEnforcement: { ...template.styleEnforcement, styleRules: e.target.value },
                                      })
                                    }
                                    rows={2}
                                    className="font-mono text-sm"
                                  />
                                )}

                                <div className="flex items-center justify-between">
                                  <Label>Negative Prompt</Label>
                                  <Switch
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
                                  <Textarea
                                    value={template.negativePrompt.items}
                                    onChange={(e) =>
                                      setTemplate({
                                        ...template,
                                        negativePrompt: { ...template.negativePrompt, items: e.target.value },
                                      })
                                    }
                                    rows={4}
                                    className="font-mono text-sm"
                                  />
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </TabsContent>

                      <TabsContent value="colors" className="mt-0 space-y-4">
                        {isUniversalTemplate(template) && (
                          <div className="space-y-4">
                            <div>
                              <Label>Palette Mode</Label>
                              <Select
                                value={template.paletteMode || "loose"}
                                onValueChange={(value: "loose" | "strict") =>
                                  setTemplate({ ...template, paletteMode: value })
                                }
                              >
                                <SelectTrigger data-testid="select-palette-mode">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="loose">Loose (Description)</SelectItem>
                                  <SelectItem value="strict">Strict (HEX Colors)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {template.paletteMode === "loose" ? (
                              <div>
                                <Label>Color Description</Label>
                                <Textarea
                                  value={template.loosePalette || ""}
                                  onChange={(e) => setTemplate({ ...template, loosePalette: e.target.value })}
                                  placeholder="Use the blue-cyan family exactly as in the reference images..."
                                  rows={4}
                                  className="font-mono text-sm"
                                  data-testid="textarea-loose-palette"
                                />
                              </div>
                            ) : (
                              <div>
                                <Label>Strict Palette (HEX Colors)</Label>
                                <ColorPaletteManager
                                  colors={(template.strictPalette || []).map((hex: string) => ({ name: "", hex, role: "primary" }))}
                                  onColorsChange={(colors: Color[]) => setTemplate({ ...template, strictPalette: colors.map(c => c.hex) })}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {isStructuredTemplate(template) && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label>Color Mode</Label>
                              <Select
                                value={template.colorMode || "default"}
                                onValueChange={(value: "default" | "custom") =>
                                  setTemplate({ ...template, colorMode: value })
                                }
                              >
                                <SelectTrigger className="w-40" data-testid="select-color-mode">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="default">Default</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {template.colorMode === "custom" && (
                              <div>
                                <Label>Custom Colors</Label>
                                <ColorPaletteManager
                                  colors={template.customColors?.colors || []}
                                  onColorsChange={(colors: Color[]) =>
                                    setTemplate({
                                      ...template,
                                      customColors: {
                                        ...template.customColors,
                                        colors: colors,
                                      },
                                    })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {isSimpleTemplate(template) && (
                          <p className="text-muted-foreground text-sm">
                            Simple templates do not support color configuration.
                          </p>
                        )}
                      </TabsContent>

                      <TabsContent value="references" className="mt-0 space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Reference Images ({referenceImages.length})</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoadingImages}
                            data-testid="button-upload-reference"
                          >
                            {isLoadingImages ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-1" />
                            )}
                            Upload
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>

                        {referenceImages.length === 0 ? (
                          <div className="border-2 border-dashed rounded-lg p-8 text-center">
                            <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No reference images. Upload images to define the visual style.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {referenceImages.map((image, index) => (
                              <div
                                key={image.id}
                                draggable
                                onDragStart={() => handleDragStart(image.id)}
                                onDragOver={(e) => handleDragOver(e, image.id)}
                                onDrop={() => handleDrop(image.id)}
                                onDragEnd={() => {
                                  setDraggedImageId(null);
                                  setDragOverImageId(null);
                                }}
                                className={`relative group rounded-lg overflow-hidden border ${
                                  dragOverImageId === image.id ? "border-primary" : "border-border"
                                } ${draggedImageId === image.id ? "opacity-50" : ""}`}
                              >
                                <ImageWithFallback
                                  src={image.url}
                                  alt={`Reference ${index + 1}`}
                                  className="w-full h-auto"
                                  fallbackText="Failed to load"
                                />
                                {/* Control overlay: always visible on mobile, hover on desktop */}
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent sm:absolute sm:inset-0 sm:h-auto sm:bg-black/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-end sm:items-center justify-center pb-2 sm:pb-0 pointer-events-none">
                                  <div className="flex gap-2 pointer-events-auto">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-white bg-black/40 sm:bg-transparent"
                                      onClick={() => setPreviewImageUrl(image.url)}
                                      data-testid={`button-preview-reference-${index}`}
                                    >
                                      <Maximize2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-white bg-black/40 sm:bg-transparent"
                                      onClick={() => handleRemoveImage(image.id)}
                                      data-testid={`button-remove-reference-${index}`}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="absolute top-2 left-2 cursor-grab hidden sm:block">
                                  <GripVertical className="w-4 h-4 text-white drop-shadow-lg" />
                                </div>
                                <Badge className="absolute top-2 right-2" variant="secondary">
                                  {index + 1}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="characters" className="mt-0 space-y-4">
                        {(() => {
                          // Filter characters: either have a card for this style, or have a selected card
                          // Then sort: style-matched first, fallback last
                          const relevantCharacters = (characters?.filter(c => {
                            const cards = (c.characterCards as CharacterCard[] | null) || [];
                            const hasStyleCard = cards.some((card: CharacterCard) => card.styleId === selectedStyleId);
                            const hasSelectedCard = c.selectedCardId && cards.some((card: CharacterCard) => card.id === c.selectedCardId);
                            return hasStyleCard || hasSelectedCard;
                          }) || []).sort((a, b) => {
                            const aCards = (a.characterCards as CharacterCard[] | null) || [];
                            const bCards = (b.characterCards as CharacterCard[] | null) || [];
                            const aHasStyleMatch = aCards.some((card: CharacterCard) => card.styleId === selectedStyleId);
                            const bHasStyleMatch = bCards.some((card: CharacterCard) => card.styleId === selectedStyleId);
                            if (aHasStyleMatch && !bHasStyleMatch) return -1;
                            if (!aHasStyleMatch && bHasStyleMatch) return 1;
                            return 0;
                          });
                          
                          // Helper function to get avatar for a character based on current style
                          // Returns { imageUrl: string, crop?: AvatarCrop } or null
                          const getCharacterAvatar = (character: SelectCharacter): { imageUrl: string; crop?: AvatarCrop } | null => {
                            const cards = (character.characterCards as CharacterCard[] | null) || [];
                            const avatarProfiles = (character.avatarProfiles as Record<string, AvatarProfile> | null) || {};
                            
                            // Priority 1: Per-style avatar profile for current style
                            if (selectedStyleId && avatarProfiles[selectedStyleId]) {
                              const profile = avatarProfiles[selectedStyleId];
                              if (profile?.cardId) {
                                const avatarCard = cards.find((c: CharacterCard) => c.id === profile.cardId);
                                if (avatarCard && avatarCard.imageUrl) {
                                  return { imageUrl: avatarCard.imageUrl, crop: profile.crop };
                                }
                              }
                            }
                            
                            // Priority 2: Any style's avatar profile (iterate to find first valid one)
                            for (const profileKey of Object.keys(avatarProfiles)) {
                              const profile = avatarProfiles[profileKey];
                              if (profile?.cardId) {
                                const avatarCard = cards.find((c: CharacterCard) => c.id === profile.cardId);
                                if (avatarCard && avatarCard.imageUrl) {
                                  return { imageUrl: avatarCard.imageUrl, crop: profile.crop };
                                }
                              }
                            }
                            
                            // Priority 3: Selected card
                            if (character.selectedCardId) {
                              const selectedCard = cards.find((c: CharacterCard) => c.id === character.selectedCardId);
                              if (selectedCard && selectedCard.imageUrl) {
                                return { imageUrl: selectedCard.imageUrl, crop: undefined };
                              }
                            }
                            
                            // Priority 4: First card with valid imageUrl
                            const cardWithImage = cards.find((c: CharacterCard) => c.imageUrl);
                            if (cardWithImage && cardWithImage.imageUrl) {
                              return { imageUrl: cardWithImage.imageUrl, crop: undefined };
                            }
                            
                            return null;
                          };
                          
                          if (relevantCharacters.length === 0) {
                            return (
                              <div className="text-center py-8 space-y-4" data-testid="characters-empty-state">
                                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                                  <User className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <div className="text-muted-foreground">
                                  <p className="text-sm mb-2">No character cards for this style yet</p>
                                  <p className="text-xs">Create character cards in the Character Editor</p>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => navigate('/characters')}
                                  data-testid="button-open-character-editor"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Open Character Editor
                                </Button>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="space-y-4" data-testid="characters-list">
                              <div className="flex items-center justify-between gap-2">
                                <Label>Characters ({relevantCharacters.length})</Label>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => navigate('/characters')}
                                  data-testid="button-add-more-characters"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add More
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-3">
                                {relevantCharacters.map((character) => {
                                  const cards = (character.characterCards as CharacterCard[] | null) || [];
                                  const styleSpecificCards = cards.filter((card: CharacterCard) => card.styleId === selectedStyleId);
                                  const hasStyleMatch = styleSpecificCards.length > 0;
                                  
                                  // Display card selection priority:
                                  // 1. If selectedCardId belongs to current style, use it (respects user's "Save changes")
                                  // 2. Otherwise, use the newest card for this style (sorted by createdAt descending)
                                  // 3. Fall back to selectedCardId if no style-specific cards
                                  let displayCard: CharacterCard | undefined;
                                  
                                  if (hasStyleMatch) {
                                    // Check if the user's selected card belongs to this style
                                    const selectedCardForStyle = styleSpecificCards.find(
                                      (card: CharacterCard) => card.id === character.selectedCardId
                                    );
                                    if (selectedCardForStyle) {
                                      displayCard = selectedCardForStyle;
                                    } else {
                                      // Use the newest card for this style
                                      const sortedCards = [...styleSpecificCards].sort((a, b) => {
                                        const dateA = new Date(a.createdAt || 0).getTime();
                                        const dateB = new Date(b.createdAt || 0).getTime();
                                        return dateB - dateA; // Newest first
                                      });
                                      displayCard = sortedCards[0];
                                    }
                                  } else if (character.selectedCardId) {
                                    // No style-specific cards, use fallback
                                    displayCard = cards.find((card: CharacterCard) => card.id === character.selectedCardId);
                                  }
                                  
                                  // Use cardId for reliable selection tracking (URLs may change/expire)
                                  // Check if this character's displayCard is in the selected array
                                  const isSelected = Boolean(
                                    displayCard?.id && 
                                    selectedCharacterRefs.some(ref => ref.cardId === displayCard.id)
                                  );
                                  
                                  // Get avatar with crop info
                                  const avatarInfo = getCharacterAvatar(character);
                                  
                                  return (
                                    <div
                                      key={character.id}
                                      className="flex flex-col items-center gap-1 group cursor-pointer"
                                      onClick={() => {
                                        if (displayCard?.id && displayCard?.imageUrl) {
                                          // Toggle selection: click to add, click again to remove
                                          if (isSelected) {
                                            setSelectedCharacterRefs(prev => 
                                              prev.filter(ref => ref.cardId !== displayCard.id)
                                            );
                                          } else {
                                            setSelectedCharacterRefs(prev => [
                                              ...prev,
                                              {
                                                cardId: displayCard.id,
                                                imageUrl: displayCard.imageUrl,
                                                characterName: character.name,
                                                visualPrompt: character.visualPrompt || undefined,
                                              }
                                            ]);
                                          }
                                        }
                                      }}
                                      onDoubleClick={() => displayCard?.imageUrl && setPreviewImageUrl(displayCard.imageUrl)}
                                      data-testid={`character-card-${character.id}`}
                                    >
                                      <div className={`relative rounded-full transition-all ${
                                        isSelected 
                                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                                          : "hover-elevate"
                                      }`}>
                                        {avatarInfo ? (
                                          <CroppedAvatar
                                            imageUrl={avatarInfo.imageUrl}
                                            crop={avatarInfo.crop}
                                            size={56}
                                          />
                                        ) : (
                                          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                                            <span className="text-lg font-medium text-muted-foreground">
                                              {character.name.charAt(0).toUpperCase()}
                                            </span>
                                          </div>
                                        )}
                                        {isSelected && (
                                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="w-3 h-3 text-primary-foreground" />
                                          </div>
                                        )}
                                        {!hasStyleMatch && !isSelected && (
                                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center" title="Fallback">
                                            <span className="text-[10px] text-white font-bold">!</span>
                                          </div>
                                        )}
                                      </div>
                                      <span className={`text-xs text-center max-w-16 truncate ${
                                        isSelected ? "text-primary font-medium" : "text-muted-foreground"
                                      }`}>
                                        {character.name}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Fallback character generate option */}
                              {relevantCharacters.some(c => {
                                const cards = (c.characterCards as CharacterCard[] | null) || [];
                                return !cards.some((card: CharacterCard) => card.styleId === selectedStyleId);
                              }) && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <div className="w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center">
                                    <span className="text-[8px] text-white font-bold">!</span>
                                  </div>
                                  <span>Characters with fallback cards - click to go to Character Editor to generate for this style</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </TabsContent>

                      <TabsContent value="meta" className="mt-0 space-y-4">
                        <div>
                          <Label>Style ID</Label>
                          <Input value={selectedStyle.id} disabled className="bg-muted" />
                        </div>
                        <div>
                          <Label>Label</Label>
                          <Input value={selectedStyle.label} disabled className="bg-muted" />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea value={selectedStyle.description} disabled className="bg-muted" rows={2} />
                        </div>
                        <div>
                          <Label>Supported Engines</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedStyle.engines.map((engine) => (
                              <Badge key={engine} variant="outline">{engine}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label>Base Prompt</Label>
                          <Textarea value={selectedStyle.basePrompt} disabled className="bg-muted font-mono text-sm" rows={2} />
                        </div>
                      </TabsContent>
                    </ScrollArea>
                  </Tabs>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Select a style to edit
                </div>
              )}
            </Card>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-4">
            <Card className="p-4 min-h-[400px] lg:h-[calc(100vh-180px)] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Preview</h2>
                <Button size="sm" variant="outline" onClick={handleCopyPreview}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>

              <ScrollArea className="flex-1 mb-4">
                <div className="bg-muted rounded-lg p-4">
                  <pre className="text-xs whitespace-pre-wrap font-mono">{previewPrompt || "Select a style to see the preview"}</pre>
                </div>
              </ScrollArea>

              <Separator className="my-4" />

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-medium">Test Generation</h3>
                  {selectedCharacterRefs.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {selectedCharacterRefs.map((ref) => (
                        <Badge 
                          key={ref.cardId}
                          variant="outline" 
                          className="text-xs cursor-pointer"
                          onClick={() => setSelectedCharacterRefs(prev => 
                            prev.filter(r => r.cardId !== ref.cardId)
                          )}
                        >
                          {ref.characterName}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                      {selectedCharacterRefs.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-muted-foreground"
                          onClick={() => setSelectedCharacterRefs([])}
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Test Result Area */}
                <div className="rounded-lg border overflow-hidden bg-muted/30">
                  {generateMutation.isPending ? (
                    <div className="aspect-video flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Generating image...</p>
                    </div>
                  ) : testResultUrl ? (
                    <div 
                      className="cursor-pointer relative group"
                      onClick={() => setPreviewImageUrl(testResultUrl)}
                    >
                      <ImageWithFallback
                        src={testResultUrl}
                        alt="Test result"
                        className="w-full h-auto"
                        fallbackText="Failed to load"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video flex flex-col items-center justify-center gap-2">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground">No test result yet</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Engine</Label>
                  <Select value={testEngine} onValueChange={setTestEngine}>
                    <SelectTrigger data-testid="select-test-engine">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedStyle?.engines || ["nanobanana", "seedream", "nanopro"]).map((engine) => (
                        <SelectItem key={engine} value={engine}>
                          {engine === "nanobanana" ? "NanoBanana Edit" : 
                           engine === "seedream" ? "SeeDream V4" : 
                           engine === "nanopro" ? "Nano Pro" : engine}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                    <Label>Test Prompt</Label>
                    {selectedCharacterRefs.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedCharacterRefs.map((ref) => (
                          <button
                            key={ref.cardId}
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => {
                              const placeholder = `[${ref.characterName}]`;
                              if (!testPrompt.includes(placeholder)) {
                                const textarea = testPromptRef.current;
                                if (textarea) {
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const before = testPrompt.substring(0, start);
                                  const after = testPrompt.substring(end);
                                  const newValue = before + placeholder + after;
                                  setTestPrompt(newValue);
                                  setTimeout(() => {
                                    textarea.focus();
                                    const newCursorPos = start + placeholder.length;
                                    textarea.setSelectionRange(newCursorPos, newCursorPos);
                                  }, 0);
                                } else {
                                  setTestPrompt(prev => `${prev} ${placeholder}`.trim());
                                }
                              }
                            }}
                            data-testid={`button-insert-${ref.cardId}`}
                          >
                            + [{ref.characterName}]
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Textarea
                    ref={testPromptRef}
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    placeholder={selectedCharacterRefs.length > 0 
                      ? `[${selectedCharacterRefs.map(r => r.characterName).join('] and [')}] running in the park...`
                      : "A girl running in the park..."
                    }
                    rows={2}
                    data-testid="textarea-test-prompt"
                  />
                  {selectedCharacterRefs.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Use {selectedCharacterRefs.map(r => `[${r.characterName}]`).join(', ')} in your prompt to reference the selected character{selectedCharacterRefs.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleTestGenerate}
                  disabled={!selectedStyleId || !testPrompt.trim() || generateMutation.isPending}
                  className="w-full"
                  data-testid="button-test-generate"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Test Generate
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={previewImageUrl !== null} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl p-2 sm:p-6">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {previewImageUrl && (
            <div className="relative w-full">
              <ImageWithFallback
                src={previewImageUrl}
                alt="Preview"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                loading="lazy"
                fallbackText="Failed to load preview image"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clone Style Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Style</DialogTitle>
            <DialogDescription>
              Create a copy of "{selectedStyle?.label}" that you can modify independently.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="clone-label">New Style Name</Label>
              <Input
                id="clone-label"
                value={cloneNewLabel}
                onChange={(e) => setCloneNewLabel(e.target.value)}
                placeholder="Enter name for the cloned style"
                data-testid="input-clone-label"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => cloneStyleMutation.mutate({ sourceId: selectedStyleId, newLabel: cloneNewLabel })}
              disabled={!cloneNewLabel.trim() || cloneStyleMutation.isPending}
              data-testid="button-confirm-clone"
            >
              {cloneStyleMutation.isPending ? "Cloning..." : "Clone Style"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Style Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={(open) => {
        setShowRenameDialog(open);
        if (!open) {
          setRenameStyleId(null);
          setRenameNewLabel("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Style</DialogTitle>
            <DialogDescription>
              Enter a new name for this style.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rename-label">New Name</Label>
              <Input
                id="rename-label"
                value={renameNewLabel}
                onChange={(e) => setRenameNewLabel(e.target.value)}
                placeholder="Enter new style name"
                data-testid="input-rename-label"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => renameStyleId && renameStyleMutation.mutate({ styleId: renameStyleId, label: renameNewLabel })}
              disabled={!renameNewLabel.trim() || renameStyleMutation.isPending}
              data-testid="button-confirm-rename"
            >
              {renameStyleMutation.isPending ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Style Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Style</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedStyle?.label}"? This will also delete all associated template settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStyleMutation.mutate(selectedStyleId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteStyleMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteStyleMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Style Dialog */}
      <Dialog open={showNewStyleDialog} onOpenChange={setShowNewStyleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Style</DialogTitle>
            <DialogDescription>
              Create a new custom style preset with default settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-style-label">Style Name</Label>
              <Input
                id="new-style-label"
                value={newStyleLabel}
                onChange={(e) => setNewStyleLabel(e.target.value)}
                placeholder="My Custom Style"
                data-testid="input-new-style-label"
              />
            </div>
            <div>
              <Label htmlFor="new-style-description">Description</Label>
              <Input
                id="new-style-description"
                value={newStyleDescription}
                onChange={(e) => setNewStyleDescription(e.target.value)}
                placeholder="Brief description of the style"
                data-testid="input-new-style-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewStyleDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createStyleMutation.mutate({ label: newStyleLabel, description: newStyleDescription || newStyleLabel })}
              disabled={!newStyleLabel.trim() || createStyleMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createStyleMutation.isPending ? "Creating..." : "Create Style"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Upload, 
  RefreshCw, 
  Plus,
  Trash2,
  History,
  Loader2,
  Sparkles,
  Pencil,
  ChevronDown,
  FolderPlus,
  Save,
  RotateCcw,
  MoreHorizontal,
  Check,
  Eye,
  X,
  Users,
  Copy,
  Download,
  Settings
} from "lucide-react";
import type { SelectStoryboardScene, StylePreset, SelectGenerationHistory, SelectStoryboard, SelectStoryboardVersion, SelectCharacter, CharacterCard, AvatarProfile, AvatarCrop } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CroppedAvatar } from "@/components/AvatarCropDialog";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { SettingsBar, EngineType } from "@/components/SettingsBar";
import { getSelectedStyleId, setSelectedStyleId, getEngine, setEngine } from "@/lib/generationState";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useGeneration } from "@/contexts/GenerationContext";
import { useCharacters, CHARACTERS_QUERY_KEY } from "@/hooks/use-characters";
import { StageNavigation } from "@/components/StageNavigation";
import { useRole } from "@/contexts/RoleContext";
import { SceneInspector } from "@/components/SceneInspector";
import { StoryboardSetup } from "@/components/StoryboardSetup";
import { useLocation, useSearch } from "wouter";

interface EditingState {
  sceneDescription: string;
}

interface EditDialogState {
  sceneId: number;
  imageUrl: string;
  editPrompt: string;
}

const CURRENT_STORYBOARD_KEY = "currentStoryboardId";

function getCurrentStoryboardId(): number | null {
  // Check URL parameter first
  const urlParams = new URLSearchParams(window.location.search);
  const urlId = urlParams.get("id");
  if (urlId) {
    const parsedId = parseInt(urlId, 10);
    if (!isNaN(parsedId)) {
      return parsedId;
    }
  }
  // Fall back to localStorage
  const saved = localStorage.getItem(CURRENT_STORYBOARD_KEY);
  return saved ? parseInt(saved, 10) : null;
}

function setCurrentStoryboardId(id: number) {
  localStorage.setItem(CURRENT_STORYBOARD_KEY, id.toString());
}

function clearCurrentStoryboardId() {
  localStorage.removeItem(CURRENT_STORYBOARD_KEY);
}

export default function Storyboard() {
  const { toast } = useToast();
  const { startGeneration, isGenerating } = useGeneration();
  const { isDesigner, isViewer } = useRole();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const setupStep = urlParams.get("step") as "style" | "characters" | "ready" | null;
  const [editingScenes, setEditingScenes] = useState<Record<number, EditingState>>({});
  const [selectedStyle, setSelectedStyle] = useState<string>(getSelectedStyleId() || "");
  const [selectedEngine, setSelectedEngineState] = useState<EngineType>((getEngine() || "nanobanana") as EngineType);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historySceneId, setHistorySceneId] = useState<number | null>(null);
  const [editDialog, setEditDialog] = useState<EditDialogState | null>(null);
  
  const [currentStoryboardId, setCurrentStoryboardIdState] = useState<number | null>(getCurrentStoryboardId());
  const [createStoryboardDialogOpen, setCreateStoryboardDialogOpen] = useState(false);
  const [newStoryboardName, setNewStoryboardName] = useState("");
  const [renameStoryboardDialogOpen, setRenameStoryboardDialogOpen] = useState(false);
  const [renameStoryboardName, setRenameStoryboardName] = useState("");
  const [deleteStoryboardDialogOpen, setDeleteStoryboardDialogOpen] = useState(false);
  
  const [saveVersionDialogOpen, setSaveVersionDialogOpen] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [versionDescription, setVersionDescription] = useState("");
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; prompt: string; style: string; engine: string; date: string } | null>(null);
  const [characterPopoverOpen, setCharacterPopoverOpen] = useState<number | null>(null);
  const [copyCharsDialogOpen, setCopyCharsDialogOpen] = useState(false);
  const [copyCharsSourceScene, setCopyCharsSourceScene] = useState<{ id: number; characterIds: string[] } | null>(null);
  const [copyCharsTargetScenes, setCopyCharsTargetScenes] = useState<number[]>([]);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  

  const { data: storyboards, isLoading: storyboardsLoading, isError: storyboardsError, error: storyboardsErrorDetails, refetch: refetchStoryboards } = useQuery<SelectStoryboard[]>({
    queryKey: ["/api/storyboards"],
  });

  useEffect(() => {
    if (storyboardsError) {
      toast({
        title: "Error loading storyboards",
        description: storyboardsErrorDetails?.message || "Failed to load storyboards. Please try refreshing the page.",
        variant: "destructive",
      });
    }
  }, [storyboardsError, storyboardsErrorDetails, toast]);

  const handleRetryStoryboards = () => {
    clearCurrentStoryboardId();
    setCurrentStoryboardIdState(null);
    refetchStoryboards();
  };

  const { data: scenes, isLoading: scenesLoading, isError: scenesError, error: scenesErrorDetails, refetch } = useQuery<SelectStoryboardScene[]>({
    queryKey: ["/api/scenes", currentStoryboardId],
    queryFn: async () => {
      if (!currentStoryboardId) return [];
      const res = await fetch(`/api/scenes?storyboardId=${currentStoryboardId}`);
      if (!res.ok) throw new Error("Failed to fetch scenes");
      return res.json();
    },
    enabled: !!currentStoryboardId,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (scenesError && scenesErrorDetails) {
      toast({
        title: "Error loading scenes",
        description: scenesErrorDetails.message || "Failed to load scenes. Please try refreshing.",
        variant: "destructive",
      });
    }
  }, [scenesError, scenesErrorDetails, toast]);

  const { data: styles, isLoading: stylesLoading } = useQuery<StylePreset[]>({
    queryKey: ["/api/styles"],
  });

  const { data: characters } = useCharacters();

  const { data: sceneHistory, isLoading: historyLoading } = useQuery<SelectGenerationHistory[]>({
    queryKey: ["/api/history/scene", historySceneId],
    enabled: historySceneId !== null,
  });

  const { data: versions, isLoading: versionsLoading, isError: versionsError, refetch: refetchVersions } = useQuery<SelectStoryboardVersion[]>({
    queryKey: ["/api/storyboards", currentStoryboardId, "versions"],
    queryFn: async () => {
      if (!currentStoryboardId) return [];
      const res = await fetch(`/api/storyboards/${currentStoryboardId}/versions`);
      if (!res.ok) throw new Error("Failed to fetch versions");
      return res.json();
    },
    enabled: !!currentStoryboardId && versionsDialogOpen,
  });

  const { isLoading: charactersLoading } = useCharacters();

  // Sync URL parameter to localStorage on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlId = urlParams.get("id");
    if (urlId) {
      const parsedId = parseInt(urlId, 10);
      if (!isNaN(parsedId)) {
        // Always sync to localStorage when arriving via URL param
        setCurrentStoryboardId(parsedId);
        if (parsedId !== currentStoryboardId) {
          setCurrentStoryboardIdState(parsedId);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (storyboards && storyboards.length > 0) {
      if (!currentStoryboardId) {
        const firstStoryboard = storyboards[0];
        setCurrentStoryboardIdState(firstStoryboard.id);
        setCurrentStoryboardId(firstStoryboard.id);
      } else {
        const storedIdExists = storyboards.some(s => s.id === currentStoryboardId);
        if (!storedIdExists) {
          // Check if the ID comes from URL - if so, don't reset yet (new project may not be in cache)
          const urlParams = new URLSearchParams(window.location.search);
          const urlId = urlParams.get("id");
          if (urlId && parseInt(urlId, 10) === currentStoryboardId) {
            // ID is from URL, wait for cache to update instead of resetting
            return;
          }
          const firstStoryboard = storyboards[0];
          setCurrentStoryboardIdState(firstStoryboard.id);
          setCurrentStoryboardId(firstStoryboard.id);
        }
      }
    } else if (storyboards && storyboards.length === 0) {
      clearCurrentStoryboardId();
      setCurrentStoryboardIdState(null);
    }
  }, [storyboards, currentStoryboardId]);

  useEffect(() => {
    if (styles && styles.length > 0 && !selectedStyle) {
      const savedStyleId = getSelectedStyleId();
      if (savedStyleId && styles.some(s => s.id === savedStyleId)) {
        setSelectedStyle(savedStyleId);
      } else {
        setSelectedStyle(styles[0].id);
        setSelectedStyleId(styles[0].id);
      }
    }
  }, [styles, selectedStyle]);
  
  const handleStyleChange = (value: string) => {
    setSelectedStyle(value);
    setSelectedStyleId(value);
  };

  const handleEngineChange = (value: EngineType) => {
    setSelectedEngineState(value);
    setEngine(value);
  };

  const handleStoryboardChange = (id: number) => {
    setCurrentStoryboardIdState(id);
    setCurrentStoryboardId(id);
    setEditingScenes({});
    setSelectedSceneId(null);
  };

  const openSceneHistory = (sceneId: number) => {
    setHistorySceneId(sceneId);
    setHistoryDialogOpen(true);
  };

  const closeSceneHistory = () => {
    setHistoryDialogOpen(false);
    setHistorySceneId(null);
  };

  const createStoryboardMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/storyboards", { name });
    },
    onSuccess: async (res) => {
      const newStoryboard = await res.json() as SelectStoryboard;
      queryClient.invalidateQueries({ queryKey: ["/api/storyboards"] });
      setCurrentStoryboardIdState(newStoryboard.id);
      setCurrentStoryboardId(newStoryboard.id);
      setCreateStoryboardDialogOpen(false);
      setNewStoryboardName("");
      toast({
        title: "Storyboard created",
        description: `"${newStoryboard.name}" is ready to use`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create storyboard",
        variant: "destructive",
      });
    },
  });

  const updateStoryboardMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return apiRequest("PATCH", `/api/storyboards/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storyboards"] });
      setRenameStoryboardDialogOpen(false);
      setRenameStoryboardName("");
      toast({
        title: "Storyboard renamed",
        description: "Storyboard name updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to rename storyboard",
        variant: "destructive",
      });
    },
  });

  const deleteStoryboardMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/storyboards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storyboards"] });
      setDeleteStoryboardDialogOpen(false);
      if (storyboards && storyboards.length > 1) {
        const remaining = storyboards.filter(s => s.id !== currentStoryboardId);
        if (remaining.length > 0) {
          setCurrentStoryboardIdState(remaining[0].id);
          setCurrentStoryboardId(remaining[0].id);
        } else {
          clearCurrentStoryboardId();
          setCurrentStoryboardIdState(null);
        }
      } else {
        clearCurrentStoryboardId();
        setCurrentStoryboardIdState(null);
      }
      toast({
        title: "Storyboard deleted",
        description: "Storyboard and all its scenes have been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete storyboard",
        variant: "destructive",
      });
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      if (!currentStoryboardId) throw new Error("No storyboard selected");
      return apiRequest("POST", `/api/storyboards/${currentStoryboardId}/versions`, { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storyboards", currentStoryboardId, "versions"] });
      setSaveVersionDialogOpen(false);
      setVersionName("");
      setVersionDescription("");
      toast({
        title: "Version saved",
        description: "Current state has been saved as a version",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save version",
        variant: "destructive",
      });
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async (versionId: number) => {
      return apiRequest("POST", `/api/storyboards/versions/${versionId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenes", currentStoryboardId] });
      queryClient.invalidateQueries({ queryKey: ["/api/storyboards", currentStoryboardId, "versions"] });
      setVersionsDialogOpen(false);
      toast({
        title: "Version restored",
        description: "Storyboard has been restored to the selected version",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore version",
        variant: "destructive",
      });
    },
  });

  const deleteVersionMutation = useMutation({
    mutationFn: async (versionId: number) => {
      return apiRequest("DELETE", `/api/storyboards/versions/${versionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storyboards", currentStoryboardId, "versions"] });
      toast({
        title: "Version deleted",
        description: "Version has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete version",
        variant: "destructive",
      });
    },
  });

  const createSceneMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/scenes", { 
        storyboardId: currentStoryboardId,
        visualDescription: "" 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenes", currentStoryboardId] });
      toast({
        title: "Scene created",
        description: "New scene added to your storyboard",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create scene",
        variant: "destructive",
      });
    },
  });

  const updateSceneMutation = useMutation({
    mutationFn: async ({ id, visualDescription, generatedImageUrl, styleId }: { id: number; visualDescription?: string; generatedImageUrl?: string; styleId?: string }) => {
      return apiRequest("PATCH", `/api/scenes/${id}`, { visualDescription, generatedImageUrl, styleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenes", currentStoryboardId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update scene",
        variant: "destructive",
      });
    },
  });

  const rollbackSceneImageMutation = useMutation({
    mutationFn: async ({ sceneId, imageUrl }: { sceneId: number; imageUrl: string }) => {
      return apiRequest("PATCH", `/api/scenes/${sceneId}`, { generatedImageUrl: imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenes", currentStoryboardId] });
      queryClient.invalidateQueries({ queryKey: ["/api/history/scene", historySceneId] });
      toast({
        title: "Image restored",
        description: "Scene image has been updated to the selected version",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore image",
        variant: "destructive",
      });
    },
  });

  const deleteSceneMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/scenes/${id}`);
    },
    onSuccess: (_data, deletedId) => {
      if (selectedSceneId === deletedId) {
        setSelectedSceneId(null);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/scenes", currentStoryboardId] });
      toast({
        title: "Scene deleted",
        description: "Scene removed from storyboard",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete scene",
        variant: "destructive",
      });
    },
  });

  const handleDescriptionChange = useCallback((sceneId: number, value: string) => {
    setEditingScenes(prev => ({
      ...prev,
      [sceneId]: { sceneDescription: value }
    }));
  }, []);

  const handleDescriptionBlur = useCallback((scene: SelectStoryboardScene) => {
    if (!isDesigner) return;
    
    const editing = editingScenes[scene.id];
    if (!editing) return;

    const newValue = editing.sceneDescription;
    const originalValue = scene.visualDescription || "";
    
    if (newValue !== undefined && newValue !== originalValue) {
      updateSceneMutation.mutate({ 
        id: scene.id, 
        visualDescription: newValue 
      });
    }
  }, [editingScenes, updateSceneMutation, isDesigner]);

  const getCharacterAvatar = useCallback((character: SelectCharacter): { imageUrl: string; crop?: AvatarCrop } | null => {
    const cards = (character.characterCards as CharacterCard[] | null) || [];
    const avatarProfiles = (character.avatarProfiles as Record<string, AvatarProfile> | null) || {};
    
    if (selectedStyle && avatarProfiles[selectedStyle]) {
      const profile = avatarProfiles[selectedStyle];
      if (profile?.cardId) {
        const avatarCard = cards.find((c: CharacterCard) => c.id === profile.cardId);
        if (avatarCard && avatarCard.imageUrl) {
          return { imageUrl: avatarCard.imageUrl, crop: profile.crop };
        }
      }
    }
    
    for (const profileKey of Object.keys(avatarProfiles)) {
      const profile = avatarProfiles[profileKey];
      if (profile?.cardId) {
        const avatarCard = cards.find((c: CharacterCard) => c.id === profile.cardId);
        if (avatarCard && avatarCard.imageUrl) {
          return { imageUrl: avatarCard.imageUrl, crop: profile.crop };
        }
      }
    }
    
    if (character.selectedCardId) {
      const selectedCard = cards.find((c: CharacterCard) => c.id === character.selectedCardId);
      if (selectedCard && selectedCard.imageUrl) {
        return { imageUrl: selectedCard.imageUrl, crop: undefined };
      }
    }
    
    const cardWithImage = cards.find((c: CharacterCard) => c.imageUrl);
    if (cardWithImage && cardWithImage.imageUrl) {
      return { imageUrl: cardWithImage.imageUrl, crop: undefined };
    }
    
    return null;
  }, [selectedStyle]);

  const getSceneCharacterRefs = useCallback((scene: SelectStoryboardScene) => {
    const selectedIds = scene.selectedCharacterIds || [];
    if (!characters || selectedIds.length === 0) return [];
    
    const refs: { characterId: string; characterName: string; visualPrompt?: string; imageUrl: string }[] = [];
    
    for (const charId of selectedIds) {
      const character = characters.find(c => c.id === charId);
      if (!character) continue;
      
      const cards = (character.characterCards as CharacterCard[] | null) || [];
      const styleCard = cards.find((c: CharacterCard) => c.styleId === selectedStyle);
      const fallbackCard = character.selectedCardId 
        ? cards.find((c: CharacterCard) => c.id === character.selectedCardId)
        : cards[0];
      const displayCard = styleCard || fallbackCard;
      
      if (displayCard?.imageUrl) {
        refs.push({
          characterId: character.id,
          characterName: character.name,
          visualPrompt: character.visualPrompt || undefined,
          imageUrl: displayCard.imageUrl,
        });
      }
    }
    
    return refs;
  }, [characters, selectedStyle]);

  const updateSceneCharactersMutation = useMutation({
    mutationFn: async ({ sceneId, characterIds }: { sceneId: number; characterIds: string[] }) => {
      return apiRequest("PATCH", `/api/scenes/${sceneId}`, { selectedCharacterIds: characterIds });
    },
    onMutate: async ({ sceneId, characterIds }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/scenes", currentStoryboardId] });
      const previousScenes = queryClient.getQueryData<SelectStoryboardScene[]>(["/api/scenes", currentStoryboardId]);
      
      if (previousScenes) {
        const updatedScenes = previousScenes.map(scene => 
          scene.id === sceneId 
            ? { ...scene, selectedCharacterIds: characterIds }
            : scene
        );
        queryClient.setQueryData(["/api/scenes", currentStoryboardId], updatedScenes);
      }
      
      return { previousScenes };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousScenes) {
        queryClient.setQueryData(["/api/scenes", currentStoryboardId], context.previousScenes);
      }
      toast({
        title: "Error",
        description: "Failed to update scene characters",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenes", currentStoryboardId] });
    },
  });

  const copyCharsToScenesMutation = useMutation({
    mutationFn: async ({ sceneIds, characterIds }: { sceneIds: number[]; characterIds: string[] }) => {
      await Promise.all(
        sceneIds.map(sceneId => 
          apiRequest("PATCH", `/api/scenes/${sceneId}`, { selectedCharacterIds: characterIds })
        )
      );
    },
    onMutate: async ({ sceneIds, characterIds }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/scenes", currentStoryboardId] });
      const previousScenes = queryClient.getQueryData<SelectStoryboardScene[]>(["/api/scenes", currentStoryboardId]);
      
      if (previousScenes) {
        const updatedScenes = previousScenes.map(scene => 
          sceneIds.includes(scene.id)
            ? { ...scene, selectedCharacterIds: characterIds }
            : scene
        );
        queryClient.setQueryData(["/api/scenes", currentStoryboardId], updatedScenes);
      }
      
      setCopyCharsDialogOpen(false);
      setCopyCharsSourceScene(null);
      setCopyCharsTargetScenes([]);
      
      return { previousScenes };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Characters copied to selected scenes",
      });
    },
    onError: (_error, _variables, context) => {
      if (context?.previousScenes) {
        queryClient.setQueryData(["/api/scenes", currentStoryboardId], context.previousScenes);
      }
      toast({
        title: "Error",
        description: "Failed to copy characters to scenes",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenes", currentStoryboardId] });
    },
  });

  const toggleSceneCharacter = useCallback((sceneId: number, characterId: string, currentIds: string[]) => {
    const newIds = currentIds.includes(characterId)
      ? currentIds.filter(id => id !== characterId)
      : [...currentIds, characterId];
    updateSceneCharactersMutation.mutate({ sceneId, characterIds: newIds });
  }, [updateSceneCharactersMutation]);

  const openCopyCharsDialog = useCallback((sceneId: number, characterIds: string[]) => {
    setCopyCharsSourceScene({ id: sceneId, characterIds });
    setCopyCharsTargetScenes([]);
    setCopyCharsDialogOpen(true);
    setCharacterPopoverOpen(null);
  }, []);

  const toggleCopyTarget = useCallback((sceneId: number) => {
    setCopyCharsTargetScenes(prev => 
      prev.includes(sceneId) 
        ? prev.filter(id => id !== sceneId)
        : [...prev, sceneId]
    );
  }, []);

  const handleCopyCharsConfirm = useCallback(() => {
    if (copyCharsSourceScene && copyCharsTargetScenes.length > 0) {
      copyCharsToScenesMutation.mutate({
        sceneIds: copyCharsTargetScenes,
        characterIds: copyCharsSourceScene.characterIds,
      });
    }
  }, [copyCharsSourceScene, copyCharsTargetScenes, copyCharsToScenesMutation]);

  const handleGenerateClick = async (scene: SelectStoryboardScene) => {
    const editing = editingScenes[scene.id];
    const sceneDescription = editing?.sceneDescription ?? scene.visualDescription;
    
    if (!sceneDescription?.trim()) {
      toast({
        title: "Empty description",
        description: "Please enter a scene description first",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStyle) {
      toast({
        title: "No style selected",
        description: "Please select a style first",
        variant: "destructive",
      });
      return;
    }

    const characterRefs = getSceneCharacterRefs(scene);
    let finalPrompt = sceneDescription;
    
    if (characterRefs.length > 1) {
      const characterMappings = characterRefs.map((ref, index) => {
        const desc = ref.visualPrompt ? ` (${ref.visualPrompt})` : '';
        return `Reference image ${index + 1} is ${ref.characterName}${desc}`;
      }).join('. ');
      finalPrompt = `${characterMappings}. ${sceneDescription}`;
    }

    try {
      const generateData = await startGeneration({
        prompt: finalPrompt,
        styleId: selectedStyle,
        engine: selectedEngine as "nanobanana" | "seedream" | "nanopro" | "nanobanana-t2i" | "nanopro-t2i",
        sceneId: scene.id,
        sceneName: `Scene ${scene.orderIndex + 1}`,
        userReferenceImages: characterRefs.length > 0 ? characterRefs.map(r => r.imageUrl) : undefined,
      });

      await apiRequest("PATCH", `/api/scenes/${scene.id}`, {
        generatedImageUrl: generateData.imageUrl,
        styleId: selectedStyle,
        engine: selectedEngine,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/scenes", currentStoryboardId] });
      queryClient.invalidateQueries({ queryKey: ["/api/history/scene", scene.id] });

      toast({
        title: "Image generated",
        description: "Scene image has been updated",
      });
    } catch (error) {
      console.error("Generation failed:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate image",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (scene: SelectStoryboardScene) => {
    if (!scene.generatedImageUrl) {
      toast({
        title: "No image to edit",
        description: "Generate an image first before editing",
        variant: "destructive",
      });
      return;
    }
    setEditDialog({
      sceneId: scene.id,
      imageUrl: scene.generatedImageUrl,
      editPrompt: "",
    });
  };

  const handleEditSubmit = async () => {
    if (!editDialog) return;

    if (!editDialog.editPrompt.trim()) {
      toast({
        title: "Empty edit prompt",
        description: "Please describe what you want to change",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStyle) {
      toast({
        title: "No style selected",
        description: "Please select a style first",
        variant: "destructive",
      });
      return;
    }

    const sceneIdToEdit = editDialog.sceneId;
    const editPrompt = editDialog.editPrompt;
    const imageUrl = editDialog.imageUrl;
    
    setEditDialog(null);

    try {
      const generateData = await startGeneration({
        prompt: editPrompt,
        styleId: selectedStyle,
        engine: selectedEngine as "nanobanana" | "seedream" | "nanopro" | "nanobanana-t2i" | "nanopro-t2i",
        userReferenceImages: [imageUrl],
        sceneId: sceneIdToEdit,
        sceneName: `Scene Edit`,
        isEditMode: true,
      });

      await apiRequest("PATCH", `/api/scenes/${sceneIdToEdit}`, {
        generatedImageUrl: generateData.imageUrl,
        styleId: selectedStyle,
        engine: selectedEngine,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/scenes", currentStoryboardId] });
      queryClient.invalidateQueries({ queryKey: ["/api/history/scene", sceneIdToEdit] });

      toast({
        title: "Image edited",
        description: "Scene image has been updated",
      });
    } catch (error) {
      console.error("Edit failed:", error);
      toast({
        title: "Edit failed",
        description: error instanceof Error ? error.message : "Failed to edit image",
        variant: "destructive",
      });
    }
  };

  const handleDownloadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const filename = url.split("/").pop() || `image-${Date.now()}.png`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(url, "_blank");
    }
  };

  const getSceneDescription = (scene: SelectStoryboardScene) => {
    const editing = editingScenes[scene.id];
    if (editing?.sceneDescription !== undefined) {
      return editing.sceneDescription;
    }
    return scene.visualDescription || "";
  };

  const currentStoryboard = storyboards?.find(s => s.id === currentStoryboardId);
  const isLoading = storyboardsLoading || scenesLoading;
  const [, navigate] = useLocation();

  const handleSetupComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/storyboards"] });
  };

  const handleOpenStyleEditor = () => {
    navigate("/style-editor?from=setup");
  };

  const handleOpenCharacterEditor = () => {
    navigate("/characters?from=setup");
  };

  const reopenSetupMutation = useMutation({
    mutationFn: async () => {
      if (!currentStoryboardId) return;
      return apiRequest("PATCH", `/api/storyboards/${currentStoryboardId}`, {
        setupCompleted: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storyboards"] });
    },
  });

  const handleOpenSetup = () => {
    reopenSetupMutation.mutate();
  };

  if (currentStoryboard && !currentStoryboard.setupCompleted && isDesigner) {
    return (
      <div className="min-h-screen bg-background pt-14 pb-20">
        <StoryboardSetup
          storyboard={currentStoryboard}
          onComplete={handleSetupComplete}
          onOpenStyleEditor={handleOpenStyleEditor}
          onOpenCharacterEditor={handleOpenCharacterEditor}
          initialStep={setupStep || "style"}
        />
        <StageNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-14 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-foreground" data-testid="text-storyboard-title">
                  Storyboard
                </h1>
                {storyboards && storyboards.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2" data-testid="button-storyboard-selector">
                        {currentStoryboard?.name || "Select Storyboard"}
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {storyboards.map((storyboard) => (
                        <DropdownMenuItem
                          key={storyboard.id}
                          onClick={() => handleStoryboardChange(storyboard.id)}
                          className="flex items-center gap-2"
                          data-testid={`option-storyboard-${storyboard.id}`}
                        >
                          {storyboard.id === currentStoryboardId && <Check className="w-4 h-4" />}
                          <span className={storyboard.id !== currentStoryboardId ? "ml-6" : ""}>
                            {storyboard.name}
                          </span>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setCreateStoryboardDialogOpen(true)}
                        className="flex items-center gap-2"
                        data-testid="button-create-storyboard"
                      >
                        <FolderPlus className="w-4 h-4" />
                        New Storyboard
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <p className="text-muted-foreground" data-testid="text-storyboard-subtitle">
                Create scene descriptions and generate images for your story.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {currentStoryboardId && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSaveVersionDialogOpen(true)}
                      data-testid="button-save-version"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save Version</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setVersionsDialogOpen(true)}
                      data-testid="button-view-versions"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Version History</TooltipContent>
                </Tooltip>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" data-testid="button-storyboard-menu">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isDesigner && (
                      <DropdownMenuItem
                        onClick={() => handleOpenSetup()}
                        data-testid="button-project-settings"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Project Settings
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        setRenameStoryboardName(currentStoryboard?.name || "");
                        setRenameStoryboardDialogOpen(true);
                      }}
                      data-testid="button-rename-storyboard"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteStoryboardDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                      data-testid="button-delete-storyboard"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  data-testid="button-refresh-storyboard"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            
            {isDesigner && (
              currentStoryboardId ? (
                <Button
                  onClick={() => createSceneMutation.mutate()}
                  disabled={createSceneMutation.isPending}
                  data-testid="button-add-scene"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Scene
                </Button>
              ) : (
                <Button
                  onClick={() => setCreateStoryboardDialogOpen(true)}
                  data-testid="button-create-first-storyboard"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create Storyboard
                </Button>
              )
            )}
          </div>
        </div>

        {currentStoryboardId && (
          <div className="mb-6">
            <SettingsBar
              selectedStyle={selectedStyle}
              onStyleChange={handleStyleChange}
              selectedEngine={selectedEngine}
              onEngineChange={handleEngineChange}
              styles={styles}
              stylesLoading={stylesLoading}
              disabled={isViewer}
              onOpenSetupWizard={isDesigner ? handleOpenSetup : undefined}
            />
          </div>
        )}

        {storyboardsError ? (
          <Card className="p-12">
            <div className="text-center">
              <RefreshCw className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-storyboards-error-title">
                Failed to load storyboards
              </h3>
              <p className="text-muted-foreground mb-4" data-testid="text-storyboards-error-description">
                There was an error loading storyboards. Please try again.
              </p>
              <Button 
                onClick={handleRetryStoryboards}
                data-testid="button-retry-storyboards"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </Card>
        ) : !currentStoryboardId && !storyboardsLoading ? (
          <Card className="p-12">
            <div className="text-center">
              <FolderPlus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-no-storyboards-title">
                No storyboards yet
              </h3>
              <p className="text-muted-foreground mb-4" data-testid="text-no-storyboards-description">
                Create your first storyboard to start organizing your story scenes
              </p>
              <Button 
                onClick={() => setCreateStoryboardDialogOpen(true)}
                data-testid="button-create-first-storyboard-empty"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Storyboard
              </Button>
            </div>
          </Card>
        ) : scenesError && currentStoryboardId ? (
          <Card className="p-12">
            <div className="text-center">
              <RefreshCw className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-error-title">
                Failed to load scenes
              </h3>
              <p className="text-muted-foreground mb-4" data-testid="text-error-description">
                There was an error loading scenes. Please try again.
              </p>
              <Button 
                onClick={() => refetch()}
                data-testid="button-retry-scenes"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </Card>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-3 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : !scenes || scenes.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-title">
                No scenes in this storyboard
              </h3>
              <p className="text-muted-foreground mb-4" data-testid="text-empty-description">
                Start by adding scenes with descriptions to generate images
              </p>
              <Button 
                onClick={() => createSceneMutation.mutate()}
                disabled={createSceneMutation.isPending}
                data-testid="button-create-first-scene"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Scene
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {scenes.map((scene) => (
              <Card 
                key={scene.id} 
                className={`overflow-visible flex flex-col border cursor-pointer transition-all ${
                  selectedSceneId === scene.id 
                    ? "ring-2 ring-primary shadow-lg" 
                    : "hover-elevate"
                }`}
                onClick={() => setSelectedSceneId(scene.id)}
                data-testid={`scene-card-${scene.id}`}
              >
                <div 
                  className={`relative aspect-video group ${
                    scene.generatedImageUrl 
                      ? 'bg-muted' 
                      : 'bg-amber-50 dark:bg-amber-950/30 border-2 border-dashed border-amber-400 dark:border-amber-600'
                  }`}
                >
                  {isGenerating(scene.id) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="w-10 h-10 animate-spin" />
                      <span className="text-sm font-medium">Generating...</span>
                    </div>
                  ) : scene.generatedImageUrl ? (
                    <div 
                      className="w-full h-full cursor-zoom-in"
                      onClick={() => {
                        const style = styles?.find(s => s.id === scene.styleId);
                        setPreviewImage({
                          url: scene.generatedImageUrl!,
                          prompt: scene.visualDescription || "Generated image",
                          style: style?.label || scene.styleId || "Unknown",
                          engine: scene.engine || "Unknown",
                          date: "Current scene"
                        });
                      }}
                      data-testid={`button-enlarge-scene-${scene.id}`}
                    >
                      <ImageWithFallback
                        src={scene.generatedImageUrl}
                        alt={scene.visualDescription || `Scene`}
                        className="w-full h-full object-cover"
                        data-testid={`img-scene-${scene.id}`}
                        loading="lazy"
                        fallbackText="Failed to load"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                      <Upload className="w-8 h-8" />
                      <span className="text-sm font-medium">Add description and generate</span>
                    </div>
                  )}
                  
                  {isDesigner && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSceneMutation.mutate(scene.id);
                          }}
                          disabled={deleteSceneMutation.isPending || isGenerating(scene.id)}
                          data-testid={`button-delete-scene-${scene.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete Scene</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                
                <div className="flex items-center justify-between px-3 py-2 border-b text-sm text-muted-foreground">
                  <span data-testid={`text-image-status-${scene.id}`}>
                    {scene.generatedImageUrl ? "Generated Images (1)" : "No images generated yet"}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => openSceneHistory(scene.id)}
                        data-testid={`button-scene-history-${scene.id}`}
                      >
                        <History className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View History</TooltipContent>
                  </Tooltip>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-2 border-b">
                  <Popover 
                    open={characterPopoverOpen === scene.id} 
                    onOpenChange={(open) => setCharacterPopoverOpen(open ? scene.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 gap-2"
                        data-testid={`button-scene-characters-${scene.id}`}
                      >
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {(() => {
                          const selectedIds = scene.selectedCharacterIds || [];
                          const selectedChars = characters?.filter(c => selectedIds.includes(c.id)) || [];
                          if (selectedChars.length === 0) {
                            return <span className="text-xs text-muted-foreground">No characters</span>;
                          }
                          return (
                            <div className="flex items-center gap-1">
                              {selectedChars.slice(0, 3).map((char) => {
                                const avatarInfo = getCharacterAvatar(char);
                                return avatarInfo ? (
                                  <CroppedAvatar
                                    key={char.id}
                                    imageUrl={avatarInfo.imageUrl}
                                    crop={avatarInfo.crop}
                                    size={20}
                                  />
                                ) : (
                                  <div key={char.id} className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                                    <span className="text-[10px] font-medium">{char.name.charAt(0)}</span>
                                  </div>
                                );
                              })}
                              {selectedChars.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{selectedChars.length - 3}</span>
                              )}
                              <span className="text-xs">{selectedChars.map(c => c.name).join(', ')}</span>
                            </div>
                          );
                        })()}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm">Select Characters</div>
                          {isDesigner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/characters?from=storyboard&style=${selectedStyle}`)}
                              data-testid="button-manage-characters-popover"
                            >
                              <Settings className="w-3 h-3 mr-1" />
                              Manage
                            </Button>
                          )}
                        </div>
                        {charactersLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                        ) : !characters || characters.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No characters available. Create characters in the Character Editor.</p>
                        ) : (
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {characters.map((char) => {
                              const selectedIds = scene.selectedCharacterIds || [];
                              const isSelected = selectedIds.includes(char.id);
                              const avatarInfo = getCharacterAvatar(char);
                              const cards = (char.characterCards as CharacterCard[] | null) || [];
                              const hasStyleCard = cards.some((c: CharacterCard) => c.styleId === selectedStyle);
                              
                              return (
                                <button
                                  key={char.id}
                                  className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                                    isSelected 
                                      ? 'bg-primary/10 ring-1 ring-primary' 
                                      : 'hover:bg-muted'
                                  }`}
                                  onClick={() => toggleSceneCharacter(scene.id, char.id, selectedIds)}
                                  data-testid={`button-toggle-char-${char.id}-scene-${scene.id}`}
                                >
                                  <div className="relative">
                                    {avatarInfo ? (
                                      <CroppedAvatar
                                        imageUrl={avatarInfo.imageUrl}
                                        crop={avatarInfo.crop}
                                        size={32}
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                        <span className="text-sm font-medium">{char.name.charAt(0)}</span>
                                      </div>
                                    )}
                                    {isSelected && (
                                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                        <Check className="w-3 h-3 text-primary-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{char.name}</div>
                                    {!hasStyleCard && (
                                      <div className="text-[10px] text-amber-500">No card for this style</div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {(scene.selectedCharacterIds || []).length > 0 && (
                          <div className="space-y-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => openCopyCharsDialog(scene.id, scene.selectedCharacterIds || [])}
                              data-testid={`button-copy-chars-scene-${scene.id}`}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy to other scenes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-muted-foreground"
                              onClick={() => updateSceneCharactersMutation.mutate({ sceneId: scene.id, characterIds: [] })}
                              data-testid={`button-clear-chars-scene-${scene.id}`}
                            >
                              Clear all characters
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="p-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Scene Description
                    </label>
                    <Textarea
                      placeholder={isViewer ? "View-only mode" : "Enter scene description for image generation..."}
                      value={getSceneDescription(scene)}
                      onChange={(e) => {
                        if (!isDesigner) return;
                        handleDescriptionChange(scene.id, e.target.value);
                        const el = e.target;
                        el.style.height = 'auto';
                        el.style.height = `${Math.max(120, el.scrollHeight)}px`;
                      }}
                      onBlur={() => isDesigner && handleDescriptionBlur(scene)}
                      className="text-sm"
                      style={{ minHeight: '120px', resize: 'none' }}
                      readOnly={isViewer}
                      data-testid={`textarea-scene-description-${scene.id}`}
                    />
                  </div>
                  
                  {isDesigner && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={() => handleGenerateClick(scene)}
                        disabled={isGenerating(scene.id) || !getSceneDescription(scene).trim()}
                        className="flex-1"
                        data-testid={`button-generate-scene-${scene.id}`}
                      >
                        {isGenerating(scene.id) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate
                          </>
                        )}
                      </Button>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditClick(scene)}
                            disabled={isGenerating(scene.id) || !scene.generatedImageUrl}
                            data-testid={`button-edit-scene-${scene.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit with reference</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
        
        {scenes && scenes.length > 0 && (
          <div className="mt-8 text-center text-muted-foreground text-sm" data-testid="text-scene-count">
            {scenes.length} scene{scenes.length !== 1 ? 's' : ''} in storyboard
          </div>
        )}
      </div>

      <Dialog open={createStoryboardDialogOpen} onOpenChange={setCreateStoryboardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Storyboard</DialogTitle>
            <DialogDescription>
              Give your storyboard a name to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="storyboard-name" className="mb-2 block">
              Storyboard Name
            </Label>
            <Input
              id="storyboard-name"
              placeholder="Enter storyboard name..."
              value={newStoryboardName}
              onChange={(e) => setNewStoryboardName(e.target.value)}
              data-testid="input-new-storyboard-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateStoryboardDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createStoryboardMutation.mutate(newStoryboardName)}
              disabled={!newStoryboardName.trim() || createStoryboardMutation.isPending}
              data-testid="button-confirm-create-storyboard"
            >
              {createStoryboardMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameStoryboardDialogOpen} onOpenChange={setRenameStoryboardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Storyboard</DialogTitle>
            <DialogDescription>
              Enter a new name for this storyboard.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-storyboard-name" className="mb-2 block">
              New Name
            </Label>
            <Input
              id="rename-storyboard-name"
              placeholder="Enter new name..."
              value={renameStoryboardName}
              onChange={(e) => setRenameStoryboardName(e.target.value)}
              data-testid="input-rename-storyboard"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameStoryboardDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => currentStoryboardId && updateStoryboardMutation.mutate({ id: currentStoryboardId, name: renameStoryboardName })}
              disabled={!renameStoryboardName.trim() || updateStoryboardMutation.isPending}
              data-testid="button-confirm-rename-storyboard"
            >
              {updateStoryboardMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Renaming...
                </>
              ) : (
                "Rename"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteStoryboardDialogOpen} onOpenChange={setDeleteStoryboardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Storyboard</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{currentStoryboard?.name}"? This will also delete all scenes and versions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteStoryboardDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => currentStoryboardId && deleteStoryboardMutation.mutate(currentStoryboardId)}
              disabled={deleteStoryboardMutation.isPending}
              data-testid="button-confirm-delete-storyboard"
            >
              {deleteStoryboardMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveVersionDialogOpen} onOpenChange={setSaveVersionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Version</DialogTitle>
            <DialogDescription>
              Save the current state as a version you can restore later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="version-name" className="mb-2 block">
                Version Name
              </Label>
              <Input
                id="version-name"
                placeholder="e.g., Draft 1, Final Version..."
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                data-testid="input-version-name"
              />
            </div>
            <div>
              <Label htmlFor="version-description" className="mb-2 block">
                Description (optional)
              </Label>
              <Textarea
                id="version-description"
                placeholder="Add notes about this version..."
                value={versionDescription}
                onChange={(e) => setVersionDescription(e.target.value)}
                className="resize-none"
                data-testid="textarea-version-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveVersionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createVersionMutation.mutate({ name: versionName, description: versionDescription })}
              disabled={!versionName.trim() || createVersionMutation.isPending}
              data-testid="button-confirm-save-version"
            >
              {createVersionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Version
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={versionsDialogOpen} onOpenChange={setVersionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              View and restore previous versions of your storyboard.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {versionsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : versionsError ? (
              <div className="text-center py-8">
                <RefreshCw className="mx-auto h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to load versions</h3>
                <p className="text-muted-foreground mb-4">
                  There was an error loading versions. Please try again.
                </p>
                <Button onClick={() => refetchVersions()} data-testid="button-retry-versions">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : !versions || versions.length === 0 ? (
              <div className="text-center py-8">
                <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No versions saved</h3>
                <p className="text-muted-foreground">
                  Save a version to create a snapshot you can restore later.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover-elevate"
                    data-testid={`version-item-${version.id}`}
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-semibold">
                      v{version.versionNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground">{version.name}</h4>
                      {version.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {version.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Saved {format(new Date(version.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => restoreVersionMutation.mutate(version.id)}
                            disabled={restoreVersionMutation.isPending}
                            data-testid={`button-restore-version-${version.id}`}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Restore this version</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteVersionMutation.mutate(version.id)}
                            disabled={deleteVersionMutation.isPending}
                            data-testid={`button-delete-version-${version.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete version</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onOpenChange={(open) => !open && closeSceneHistory()}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scene History</DialogTitle>
            <DialogDescription>
              View all generated images for this scene.
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-32 h-24 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : !sceneHistory || sceneHistory.length === 0 ? (
            <div className="text-center py-8">
              <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No history for this scene</h3>
              <p className="text-muted-foreground">
                Generated images will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sceneHistory.map((item) => (
                <div key={item.id} className="flex gap-4 p-3 border rounded-lg" data-testid={`history-item-${item.id}`}>
                  <div 
                    className="w-32 h-24 bg-muted rounded overflow-hidden flex-shrink-0 cursor-pointer hover-elevate"
                    onClick={() => setPreviewImage({
                      url: item.generatedImageUrl,
                      prompt: item.prompt,
                      style: item.styleLabel,
                      engine: item.engine,
                      date: format(new Date(item.createdAt), "MMM d, yyyy 'at' h:mm a")
                    })}
                    data-testid={`thumbnail-preview-${item.id}`}
                  >
                    <ImageWithFallback
                      src={item.generatedImageUrl}
                      alt={item.prompt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      fallbackText="Failed"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2 mb-1">{item.prompt}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.styleLabel} - {item.engine}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(item.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewImage({
                          url: item.generatedImageUrl,
                          prompt: item.prompt,
                          style: item.styleLabel,
                          engine: item.engine,
                          date: format(new Date(item.createdAt), "MMM d, yyyy 'at' h:mm a")
                        })}
                        data-testid={`button-preview-${item.id}`}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => historySceneId && rollbackSceneImageMutation.mutate({ 
                          sceneId: historySceneId, 
                          imageUrl: item.generatedImageUrl 
                        })}
                        disabled={rollbackSceneImageMutation.isPending}
                        data-testid={`button-use-image-${item.id}`}
                      >
                        {rollbackSceneImageMutation.isPending ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Use this image
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
            <DialogDescription>
              Describe the changes you want to make. The current image will be used as a reference.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {editDialog && (
              <div className="w-full aspect-video bg-muted rounded overflow-hidden">
                <ImageWithFallback
                  src={editDialog.imageUrl}
                  alt="Current scene image"
                  className="w-full h-full object-cover"
                  fallbackText="Failed to load"
                />
              </div>
            )}
            <div>
              <Label htmlFor="edit-prompt" className="mb-2 block">
                Edit Instructions
              </Label>
              <Textarea
                id="edit-prompt"
                placeholder="Describe what you want to change..."
                value={editDialog?.editPrompt || ""}
                onChange={(e) => setEditDialog(prev => prev ? { ...prev, editPrompt: e.target.value } : null)}
                className="min-h-[80px] resize-none"
                data-testid="textarea-edit-prompt"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={!editDialog?.editPrompt.trim()}
              data-testid="button-confirm-edit"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <DialogDescription className="sr-only">
            Preview of generated image with details
          </DialogDescription>
          <div className="relative">
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/80 backdrop-blur-sm"
                onClick={() => previewImage && handleDownloadImage(previewImage.url)}
                data-testid="button-download-preview"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/80 backdrop-blur-sm"
                onClick={() => setPreviewImage(null)}
                data-testid="button-close-preview"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {previewImage && (
              <div className="flex flex-col">
                <div className="bg-muted flex items-center justify-center max-h-[70vh] overflow-hidden">
                  <img
                    src={previewImage.url}
                    alt={previewImage.prompt}
                    className="max-w-full max-h-[70vh] object-contain"
                    data-testid="img-preview-full"
                  />
                </div>
                <div className="p-4 space-y-2 border-t">
                  <p className="text-sm text-foreground">{previewImage.prompt}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{previewImage.style}</span>
                    <span>-</span>
                    <span>{previewImage.engine}</span>
                    <span>-</span>
                    <span>{previewImage.date}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={copyCharsDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCopyCharsDialogOpen(false);
          setCopyCharsSourceScene(null);
          setCopyCharsTargetScenes([]);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Characters to Scenes</DialogTitle>
            <DialogDescription>
              {copyCharsSourceScene && (() => {
                const sourceSceneIndex = scenes?.findIndex(s => s.id === copyCharsSourceScene.id) ?? -1;
                const selectedChars = characters?.filter(c => copyCharsSourceScene.characterIds.includes(c.id)) || [];
                return (
                  <span>
                    Copy {selectedChars.length} character{selectedChars.length !== 1 ? 's' : ''} 
                    ({selectedChars.map(c => c.name).join(', ')}) from Scene {sourceSceneIndex + 1} to:
                  </span>
                );
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {scenes?.filter(s => s.id !== copyCharsSourceScene?.id).map((scene, idx) => {
                const sceneIndex = scenes.findIndex(s2 => s2.id === scene.id);
                const isSelected = copyCharsTargetScenes.includes(scene.id);
                const currentChars = characters?.filter(c => (scene.selectedCharacterIds || []).includes(c.id)) || [];
                
                return (
                  <button
                    key={scene.id}
                    className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
                      isSelected 
                        ? 'bg-primary/10 ring-1 ring-primary' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleCopyTarget(scene.id)}
                    data-testid={`button-copy-target-scene-${scene.id}`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                      isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Scene {sceneIndex + 1}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {scene.visualDescription?.slice(0, 40) || 'No description'}
                        {(scene.visualDescription?.length || 0) > 40 ? '...' : ''}
                      </div>
                      {currentChars.length > 0 && (
                        <div className="text-xs text-amber-500 mt-0.5">
                          Has: {currentChars.map(c => c.name).join(', ')}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {scenes && scenes.length <= 1 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No other scenes available to copy to.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const otherSceneIds = scenes?.filter(s => s.id !== copyCharsSourceScene?.id).map(s => s.id) || [];
                setCopyCharsTargetScenes(prev => 
                  prev.length === otherSceneIds.length ? [] : otherSceneIds
                );
              }}
              data-testid="button-toggle-all-scenes"
            >
              {copyCharsTargetScenes.length === (scenes?.filter(s => s.id !== copyCharsSourceScene?.id).length || 0)
                ? 'Deselect All'
                : 'Select All'}
            </Button>
            <Button
              onClick={handleCopyCharsConfirm}
              disabled={copyCharsTargetScenes.length === 0 || copyCharsToScenesMutation.isPending}
              data-testid="button-confirm-copy-chars"
            >
              {copyCharsToScenesMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Copying...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to {copyCharsTargetScenes.length} Scene{copyCharsTargetScenes.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <StageNavigation />
      
      {selectedSceneId && (
        <SceneInspector
          isOpen={inspectorOpen}
          onToggle={() => setInspectorOpen(!inspectorOpen)}
          selectedScene={scenes?.find(s => s.id === selectedSceneId) || null}
          selectedStyleId={(() => {
            const scene = scenes?.find(s => s.id === selectedSceneId);
            return scene?.styleId || selectedStyle;
          })()}
          onStyleSelect={(styleId) => {
            updateSceneMutation.mutate({ id: selectedSceneId, styleId });
          }}
          onDescriptionChange={(desc) => {
            handleDescriptionChange(selectedSceneId, desc);
          }}
          onDescriptionBlur={() => {
            const scene = scenes?.find(s => s.id === selectedSceneId);
            if (scene) handleDescriptionBlur(scene);
          }}
          onCharacterToggle={(characterId) => {
            const scene = scenes?.find(s => s.id === selectedSceneId);
            if (scene) {
              toggleSceneCharacter(selectedSceneId, characterId, scene.selectedCharacterIds || []);
            }
          }}
          onGenerate={() => {
            const scene = scenes?.find(s => s.id === selectedSceneId);
            if (scene) handleGenerateClick(scene);
          }}
          isGenerating={isGenerating(selectedSceneId)}
          editingDescription={editingScenes[selectedSceneId]?.sceneDescription}
        />
      )}
    </div>
  );
}

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
  Check
} from "lucide-react";
import type { SelectStoryboardScene, StylePreset, SelectGenerationHistory, GenerateResponse, SelectStoryboard, SelectStoryboardVersion } from "@shared/schema";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { getSelectedStyleId, setSelectedStyleId, getEngine, setEngine } from "@/lib/generationState";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

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
  const [editingScenes, setEditingScenes] = useState<Record<number, EditingState>>({});
  const [selectedStyle, setSelectedStyle] = useState<string>(getSelectedStyleId() || "");
  const [selectedEngine, setSelectedEngineState] = useState<string>(getEngine() || "nanobanana");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historySceneId, setHistorySceneId] = useState<number | null>(null);
  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set());
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

  const { data: storyboards, isLoading: storyboardsLoading } = useQuery<SelectStoryboard[]>({
    queryKey: ["/api/storyboards"],
  });

  const { data: scenes, isLoading: scenesLoading, refetch } = useQuery<SelectStoryboardScene[]>({
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

  const { data: styles, isLoading: stylesLoading } = useQuery<StylePreset[]>({
    queryKey: ["/api/styles"],
  });

  const { data: sceneHistory, isLoading: historyLoading } = useQuery<SelectGenerationHistory[]>({
    queryKey: ["/api/history/scene", historySceneId],
    enabled: historySceneId !== null,
  });

  const { data: versions, isLoading: versionsLoading, refetch: refetchVersions } = useQuery<SelectStoryboardVersion[]>({
    queryKey: ["/api/storyboards", currentStoryboardId, "versions"],
    queryFn: async () => {
      if (!currentStoryboardId) return [];
      const res = await fetch(`/api/storyboards/${currentStoryboardId}/versions`);
      if (!res.ok) throw new Error("Failed to fetch versions");
      return res.json();
    },
    enabled: !!currentStoryboardId && versionsDialogOpen,
  });

  useEffect(() => {
    if (storyboards && storyboards.length > 0) {
      if (!currentStoryboardId) {
        const firstStoryboard = storyboards[0];
        setCurrentStoryboardIdState(firstStoryboard.id);
        setCurrentStoryboardId(firstStoryboard.id);
      } else {
        const storedIdExists = storyboards.some(s => s.id === currentStoryboardId);
        if (!storedIdExists) {
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

  const handleEngineChange = (value: string) => {
    setSelectedEngineState(value);
    setEngine(value);
  };

  const handleStoryboardChange = (id: number) => {
    setCurrentStoryboardIdState(id);
    setCurrentStoryboardId(id);
    setEditingScenes({});
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
    mutationFn: async ({ id, visualDescription }: { id: number; visualDescription?: string }) => {
      return apiRequest("PATCH", `/api/scenes/${id}`, { visualDescription });
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

  const deleteSceneMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/scenes/${id}`);
    },
    onSuccess: () => {
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
  }, [editingScenes, updateSceneMutation]);

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

    setGeneratingScenes(prev => new Set(prev).add(scene.id));

    try {
      const generateRes = await apiRequest("POST", "/api/generate", {
        prompt: sceneDescription,
        styleId: selectedStyle,
        engine: selectedEngine,
        sceneId: scene.id,
      });
      const generateData = await generateRes.json() as GenerateResponse;

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
    } finally {
      setGeneratingScenes(prev => {
        const next = new Set(prev);
        next.delete(scene.id);
        return next;
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
    
    setGeneratingScenes(prev => new Set(prev).add(sceneIdToEdit));
    setEditDialog(null);

    try {
      const generateRes = await apiRequest("POST", "/api/generate", {
        prompt: editPrompt,
        styleId: selectedStyle,
        engine: selectedEngine,
        userReferenceImages: [imageUrl],
        sceneId: sceneIdToEdit,
      });
      const generateData = await generateRes.json() as GenerateResponse;

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
    } finally {
      setGeneratingScenes(prev => {
        const next = new Set(prev);
        next.delete(sceneIdToEdit);
        return next;
      });
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

  return (
    <div className="min-h-screen bg-background">
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
            
            {currentStoryboardId ? (
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
            )}
          </div>
        </div>

        {currentStoryboardId && (
          <Card className="p-4 mb-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="style-select" className="mb-2 block text-sm font-medium">
                  Style Preset
                </Label>
                <Select
                  value={selectedStyle}
                  onValueChange={handleStyleChange}
                  disabled={stylesLoading}
                >
                  <SelectTrigger id="style-select" data-testid="select-storyboard-style">
                    <SelectValue placeholder={stylesLoading ? "Loading styles..." : "Select a style"} />
                  </SelectTrigger>
                  <SelectContent>
                    {stylesLoading ? (
                      <div className="p-2">
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : (
                      styles?.map((style) => (
                        <SelectItem key={style.id} value={style.id} data-testid={`option-storyboard-style-${style.id}`}>
                          {style.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="engine-select" className="mb-2 block text-sm font-medium">
                  Engine
                </Label>
                <Select
                  value={selectedEngine}
                  onValueChange={handleEngineChange}
                >
                  <SelectTrigger id="engine-select" data-testid="select-storyboard-engine">
                    <SelectValue placeholder="Select engine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nanobanana" data-testid="option-engine-nanobanana">
                      NanoBanana Edit
                    </SelectItem>
                    <SelectItem value="seedream" data-testid="option-engine-seedream">
                      SeeDream V4
                    </SelectItem>
                    <SelectItem value="nanopro" data-testid="option-engine-nanopro">
                      Nano Pro (2K/4K)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}

        {!currentStoryboardId && !storyboardsLoading ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenes.map((scene) => (
              <Card 
                key={scene.id} 
                className="overflow-visible flex flex-col border"
                data-testid={`scene-card-${scene.id}`}
              >
                <div 
                  className={`relative aspect-video group ${
                    scene.generatedImageUrl 
                      ? 'bg-muted' 
                      : 'bg-amber-50 dark:bg-amber-950/30 border-2 border-dashed border-amber-400 dark:border-amber-600'
                  }`}
                >
                  {generatingScenes.has(scene.id) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="w-10 h-10 animate-spin" />
                      <span className="text-sm font-medium">Generating...</span>
                    </div>
                  ) : scene.generatedImageUrl ? (
                    <ImageWithFallback
                      src={scene.generatedImageUrl}
                      alt={scene.visualDescription || `Scene`}
                      className="w-full h-full object-cover"
                      data-testid={`img-scene-${scene.id}`}
                      loading="lazy"
                      fallbackText="Failed to load"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                      <Upload className="w-8 h-8" />
                      <span className="text-sm font-medium">Add description and generate</span>
                    </div>
                  )}
                  
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
                        disabled={deleteSceneMutation.isPending || generatingScenes.has(scene.id)}
                        data-testid={`button-delete-scene-${scene.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete Scene</TooltipContent>
                  </Tooltip>
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
                
                <div className="p-3 flex-1 flex flex-col">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Scene Description
                    </label>
                    <Textarea
                      placeholder="Enter scene description for image generation..."
                      value={getSceneDescription(scene)}
                      onChange={(e) => handleDescriptionChange(scene.id, e.target.value)}
                      onBlur={() => handleDescriptionBlur(scene)}
                      className="min-h-[80px] resize-none text-sm"
                      data-testid={`textarea-scene-description-${scene.id}`}
                    />
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleGenerateClick(scene)}
                      disabled={generatingScenes.has(scene.id) || !getSceneDescription(scene).trim()}
                      className="flex-1"
                      data-testid={`button-generate-scene-${scene.id}`}
                    >
                      {generatingScenes.has(scene.id) ? (
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
                          disabled={generatingScenes.has(scene.id) || !scene.generatedImageUrl}
                          data-testid={`button-edit-scene-${scene.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit with reference</TooltipContent>
                    </Tooltip>
                  </div>
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
                <div key={item.id} className="flex gap-4 p-3 border rounded-lg">
                  <div className="w-32 h-24 bg-muted rounded overflow-hidden flex-shrink-0">
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
    </div>
  );
}

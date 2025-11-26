import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload, 
  RefreshCw, 
  Plus,
  Trash2,
  History,
  X
} from "lucide-react";
import type { SelectStoryboardScene, StylePreset, SelectGenerationHistory } from "@shared/schema";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { setPrompt, getSelectedStyleId, setSelectedStyleId, getEngine, setEngine } from "@/lib/generationState";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

interface EditingState {
  sceneDescription: string;
}

export default function Storyboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editingScenes, setEditingScenes] = useState<Record<number, EditingState>>({});
  const [selectedStyle, setSelectedStyle] = useState<string>(getSelectedStyleId() || "");
  const [selectedEngine, setSelectedEngineState] = useState<string>(getEngine() || "nanobanana");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historySceneId, setHistorySceneId] = useState<number | null>(null);
  
  const { data: scenes, isLoading, refetch } = useQuery<SelectStoryboardScene[]>({
    queryKey: ["/api/scenes"],
    refetchInterval: 30000,
  });

  const { data: styles, isLoading: stylesLoading } = useQuery<StylePreset[]>({
    queryKey: ["/api/styles"],
  });

  const { data: sceneHistory, isLoading: historyLoading } = useQuery<SelectGenerationHistory[]>({
    queryKey: ["/api/history/scene", historySceneId],
    enabled: historySceneId !== null,
  });

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

  const openSceneHistory = (sceneId: number) => {
    setHistorySceneId(sceneId);
    setHistoryDialogOpen(true);
  };

  const closeSceneHistory = () => {
    setHistoryDialogOpen(false);
    setHistorySceneId(null);
  };

  const createSceneMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/scenes", { visualDescription: "" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenes"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/scenes"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/scenes"] });
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

  const handleGenerateClick = (scene: SelectStoryboardScene) => {
    const editing = editingScenes[scene.id];
    const sceneDescription = editing?.sceneDescription ?? scene.visualDescription;
    
    if (sceneDescription?.trim()) {
      setPrompt(sceneDescription);
      setSelectedStyleId(selectedStyle);
      setEngine(selectedEngine);
      navigate(`/?sceneId=${scene.id}`);
    } else {
      toast({
        title: "Empty description",
        description: "Please enter a scene description first",
        variant: "destructive",
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-storyboard-title">
              Storyboard
            </h1>
            <p className="text-muted-foreground" data-testid="text-storyboard-subtitle">
              Create scene descriptions and generate images for your story.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
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
            
            <Button
              onClick={() => createSceneMutation.mutate()}
              disabled={createSceneMutation.isPending}
              data-testid="button-add-scene"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Scene
            </Button>
          </div>
        </div>

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

        {isLoading ? (
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
                No scenes in your storyboard
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
                  className={`relative aspect-video cursor-pointer group ${
                    scene.generatedImageUrl 
                      ? 'bg-muted' 
                      : 'bg-amber-50 dark:bg-amber-950/30 border-2 border-dashed border-amber-400 dark:border-amber-600'
                  }`}
                  onClick={() => handleGenerateClick(scene)}
                >
                  {scene.generatedImageUrl ? (
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
                      <span className="text-sm font-medium">Click Generate or Upload</span>
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
                        disabled={deleteSceneMutation.isPending}
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
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Scene Description
                    </label>
                    <Textarea
                      placeholder="Enter scene description for image generation..."
                      value={getSceneDescription(scene)}
                      onChange={(e) => handleDescriptionChange(scene.id, e.target.value)}
                      onBlur={() => handleDescriptionBlur(scene)}
                      className="min-h-[100px] resize-none text-sm border-l-4 border-l-primary rounded-l-none"
                      data-testid={`textarea-scene-description-${scene.id}`}
                    />
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

      <Dialog open={historyDialogOpen} onOpenChange={(open) => !open && closeSceneHistory()}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scene History</DialogTitle>
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
              <p className="text-muted-foreground">No generation history for this scene yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sceneHistory.map((item) => (
                <div 
                  key={item.id} 
                  className="flex gap-4 p-3 border rounded-lg"
                  data-testid={`history-item-${item.id}`}
                >
                  <div className="w-32 h-24 flex-shrink-0 bg-muted rounded overflow-hidden">
                    <ImageWithFallback
                      src={item.generatedImageUrl}
                      alt="Generated image"
                      className="w-full h-full object-cover"
                      fallbackText="Failed"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2 mb-1">{item.prompt}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{item.styleLabel}</span>
                      <span className="text-border">|</span>
                      <span className="capitalize">{item.engine}</span>
                      <span className="text-border">|</span>
                      <span>{format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

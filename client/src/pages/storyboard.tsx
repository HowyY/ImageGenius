import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { 
  Image as ImageIcon, 
  Play, 
  RefreshCw, 
  Plus,
  Trash2,
  GripVertical
} from "lucide-react";
import type { SelectStoryboardScene } from "@shared/schema";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { setPrompt } from "@/lib/generationState";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Storyboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editingPrompts, setEditingPrompts] = useState<Record<number, string>>({});
  
  const { data: scenes, isLoading, refetch } = useQuery<SelectStoryboardScene[]>({
    queryKey: ["/api/scenes"],
    refetchInterval: 30000,
  });

  const createSceneMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/scenes", { prompt: "" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenes"] });
      toast({
        title: "Scene created",
        description: "New scene added to your storyboard",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create scene",
        variant: "destructive",
      });
    },
  });

  const updateSceneMutation = useMutation({
    mutationFn: async ({ id, prompt }: { id: number; prompt: string }) => {
      return apiRequest("PATCH", `/api/scenes/${id}`, { prompt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenes"] });
    },
    onError: (error) => {
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
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete scene",
        variant: "destructive",
      });
    },
  });

  const handlePromptChange = useCallback((sceneId: number, value: string) => {
    setEditingPrompts(prev => ({ ...prev, [sceneId]: value }));
  }, []);

  const handlePromptBlur = useCallback((scene: SelectStoryboardScene) => {
    const newPrompt = editingPrompts[scene.id];
    if (newPrompt !== undefined && newPrompt !== scene.prompt) {
      updateSceneMutation.mutate({ id: scene.id, prompt: newPrompt });
    }
    setEditingPrompts(prev => {
      const { [scene.id]: _, ...rest } = prev;
      return rest;
    });
  }, [editingPrompts, updateSceneMutation]);

  const handleGenerateClick = (scene: SelectStoryboardScene) => {
    const prompt = editingPrompts[scene.id] ?? scene.prompt;
    if (prompt.trim()) {
      setPrompt(prompt);
      navigate(`/?sceneId=${scene.id}`);
    } else {
      toast({
        title: "Empty prompt",
        description: "Please enter a scene description first",
        variant: "destructive",
      });
    }
  };

  const getPromptValue = (scene: SelectStoryboardScene) => {
    return editingPrompts[scene.id] ?? scene.prompt;
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

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-4">
                  <Skeleton className="h-20 w-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : !scenes || scenes.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene, index) => (
              <Card 
                key={scene.id} 
                className="overflow-hidden flex flex-col"
                data-testid={`scene-card-${scene.id}`}
              >
                <div className="relative aspect-video bg-muted">
                  {scene.generatedImageUrl ? (
                    <ImageWithFallback
                      src={scene.generatedImageUrl}
                      alt={scene.prompt || `Scene ${index + 1}`}
                      className="w-full h-full object-cover"
                      data-testid={`img-scene-${scene.id}`}
                      loading="lazy"
                      fallbackText="Failed to load"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm"
                    data-testid={`badge-scene-number-${scene.id}`}
                  >
                    Scene {index + 1}
                  </Badge>

                  {scene.engine && (
                    <Badge 
                      variant="outline" 
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-xs"
                    >
                      {scene.engine}
                    </Badge>
                  )}
                </div>
                
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <Textarea
                    placeholder="Enter scene description..."
                    value={getPromptValue(scene)}
                    onChange={(e) => handlePromptChange(scene.id, e.target.value)}
                    onBlur={() => handlePromptBlur(scene)}
                    className="min-h-[80px] resize-none text-sm"
                    data-testid={`textarea-scene-prompt-${scene.id}`}
                  />
                  
                  <div className="flex items-center justify-between gap-2 mt-auto">
                    <Button
                      onClick={() => handleGenerateClick(scene)}
                      disabled={!getPromptValue(scene).trim()}
                      className="flex-1"
                      data-testid={`button-generate-scene-${scene.id}`}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Generate
                    </Button>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => deleteSceneMutation.mutate(scene.id)}
                          disabled={deleteSceneMutation.isPending}
                          data-testid={`button-delete-scene-${scene.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete Scene</TooltipContent>
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
    </div>
  );
}

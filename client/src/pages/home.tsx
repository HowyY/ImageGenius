import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Image as ImageIcon, AlertCircle, Download, Lock, Unlock, Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateRequestSchema } from "@shared/schema";
import type { StylePreset, GenerateRequest, GenerateResponse } from "@shared/schema";
import { getStyleLock, setStyleLock, getLastGeneratedImage, setLastGeneratedImage, getUserReferenceImages, addUserReferenceImage } from "@/lib/generationState";
import { useToast } from "@/hooks/use-toast";
import { ReferenceImagesManager } from "@/components/ReferenceImagesManager";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ImageWithFallback } from "@/components/ImageWithFallback";

export default function Home() {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedStyleDescription, setSelectedStyleDescription] = useState("");
  const [styleLocked, setStyleLocked] = useState(false);
  const [lastToastId, setLastToastId] = useState<string | undefined>(undefined);
  const [referenceImagesKey, setReferenceImagesKey] = useState(0);
  const [userRefCount, setUserRefCount] = useState(0);
  const { toast, dismiss } = useToast();

  const form = useForm<GenerateRequest>({
    resolver: zodResolver(generateRequestSchema),
    defaultValues: {
      prompt: "",
      styleId: "",
      engine: "nanobanana",
    },
  });

  const { data: styles, isLoading: stylesLoading } = useQuery<StylePreset[]>({
    queryKey: ["/api/styles"],
  });

  useEffect(() => {
    const { locked, styleId } = getStyleLock();
    const savedImage = getLastGeneratedImage();
    const userRefs = getUserReferenceImages();
    
    setStyleLocked(locked);
    setGeneratedImage(savedImage);
    setUserRefCount(userRefs.length);
    
    if (locked && styleId) {
      form.setValue("styleId", styleId);
      const style = styles?.find((s) => s.id === styleId);
      setSelectedStyleDescription(style?.description || "");
    }
  }, [styles]);

  const generateMutation = useMutation({
    mutationFn: async (data: GenerateRequest) => {
      const response = await apiRequest("POST", "/api/generate", data);
      const result = await response.json() as GenerateResponse;
      return result;
    },
    onMutate: () => {
      if (lastToastId) {
        dismiss(lastToastId);
      }
    },
    onSuccess: (data) => {
      setGeneratedImage(data.imageUrl);
      setLastGeneratedImage(data.imageUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      const { id } = toast({
        title: "Image generated successfully!",
        description: "Your image is ready.",
      });
      setLastToastId(id);
    },
  });

  const handleStyleChange = (value: string, onChange: (value: string) => void) => {
    onChange(value);
    const style = styles?.find((s) => s.id === value);
    setSelectedStyleDescription(style?.description || "");
  };

  const toggleStyleLock = () => {
    const currentStyleId = form.getValues("styleId");
    const newLocked = !styleLocked;
    
    setStyleLocked(newLocked);
    setStyleLock(newLocked, newLocked ? currentStyleId : null);
  };

  const onSubmit = (data: GenerateRequest) => {
    const userReferenceImages = getUserReferenceImages();
    
    // Load style-specific custom template from localStorage if exists
    let customTemplate = undefined;
    let templateReferenceImages: string[] = [];
    try {
      const storageKey = `promptTemplate_${data.styleId}`;
      const savedTemplate = localStorage.getItem(storageKey);
      if (savedTemplate) {
        customTemplate = JSON.parse(savedTemplate);
        // Extract reference images from template
        templateReferenceImages = customTemplate.referenceImages || [];
        console.log(`Using custom template for style: ${data.styleId} with ${templateReferenceImages.length} reference images`);
      }
    } catch (e) {
      console.error("Failed to load custom template:", e);
    }
    
    const requestData = {
      ...data,
      userReferenceImages: userReferenceImages.length > 0 ? userReferenceImages : undefined,
      customTemplate,
      templateReferenceImages: templateReferenceImages.length > 0 ? templateReferenceImages : undefined,
    };
    generateMutation.mutate(requestData);
  };

  const handleAddAsReference = () => {
    if (generatedImage) {
      const success = addUserReferenceImage(generatedImage);
      if (success) {
        const newCount = getUserReferenceImages().length;
        setUserRefCount(newCount);
        setReferenceImagesKey(prev => prev + 1);
        toast({
          title: "Added to references",
          description: `Image added to reference list (${newCount}/3)`,
        });
      } else {
        toast({
          title: "Cannot add",
          description: "Maximum 3 reference images reached or image already exists",
          variant: "destructive",
        });
      }
    }
  };

  const isGenerating = generateMutation.isPending;
  const error = generateMutation.error;

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ai-generated-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6" data-testid="card-form">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-generate">
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-prompt">Describe your image</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          data-testid="input-prompt"
                          placeholder="A serene mountain landscape at sunset, with snow-capped peaks reflecting golden light..."
                          className="min-h-32 resize-none text-base"
                          disabled={isGenerating}
                        />
                      </FormControl>
                      <FormDescription data-testid="text-prompt-counter">
                        {field.value.length} characters
                      </FormDescription>
                      <FormMessage data-testid="error-prompt" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="styleId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel data-testid="label-style">Style Preset</FormLabel>
                        {field.value && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={toggleStyleLock}
                                className="h-auto p-1"
                                data-testid="button-toggle-lock"
                              >
                                {styleLocked ? (
                                  <>
                                    <Lock className="w-4 h-4 mr-1 text-primary" />
                                    <Badge variant="default" className="text-xs" data-testid="badge-locked">Locked</Badge>
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="w-4 h-4 mr-1" />
                                    <span className="text-xs">Lock</span>
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {styleLocked 
                                ? "Style locked. Click to unlock" 
                                : "Lock this style to prevent accidental changes"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <Select
                        value={field.value}
                        onValueChange={(value) => handleStyleChange(value, field.onChange)}
                        disabled={stylesLoading || isGenerating || styleLocked}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-style" className="w-full">
                            <SelectValue placeholder={stylesLoading ? "Loading styles..." : "Select a style"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stylesLoading ? (
                            <div className="p-2" data-testid="skeleton-styles">
                              <Skeleton className="h-8 w-full" data-testid="skeleton-style-item" />
                            </div>
                          ) : (
                            styles?.map((style) => (
                              <SelectItem key={style.id} value={style.id} data-testid={`option-style-${style.id}`}>
                                {style.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {selectedStyleDescription && (
                        <FormDescription data-testid="text-style-description">
                          {selectedStyleDescription}
                        </FormDescription>
                      )}
                      <FormMessage data-testid="error-style" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="engine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-engine">Engine</FormLabel>
                      <FormControl>
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant={field.value === "nanobanana" ? "default" : "outline"}
                            onClick={() => field.onChange("nanobanana")}
                            disabled={isGenerating}
                            className="flex-1"
                            data-testid="button-engine-nanobanana"
                          >
                            Nanobanana
                          </Button>
                          <Button
                            type="button"
                            variant={field.value === "seedream" ? "default" : "outline"}
                            onClick={() => field.onChange("seedream")}
                            disabled={isGenerating}
                            className="flex-1"
                            data-testid="button-engine-seedream"
                          >
                            Seedream
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-engine" />
                    </FormItem>
                  )}
                />

                <ReferenceImagesManager 
                  key={referenceImagesKey}
                  onUpdate={() => {
                    setReferenceImagesKey(prev => prev + 1);
                    setUserRefCount(getUserReferenceImages().length);
                  }}
                />

                <Button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                  data-testid="button-generate"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Image
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </Card>

          <div className="space-y-4">
            <Card className="p-6" data-testid="card-result">
              <div className="space-y-4">
                {generatedImage && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Button
                              onClick={handleAddAsReference}
                              variant="outline"
                              size="sm"
                              disabled={userRefCount >= 3}
                              data-testid="button-add-as-reference"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {userRefCount >= 3 ? `Full (${userRefCount}/3)` : `Add as Reference (${userRefCount}/3)`}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {userRefCount >= 3 
                            ? "Maximum 3 references reached. Remove one to add new" 
                            : "Add as reference (drag to reorder priority)"}
                        </TooltipContent>
                      </Tooltip>
                      <Button
                        onClick={handleDownload}
                        variant="outline"
                        size="sm"
                        data-testid="button-download"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
                <div className="aspect-video bg-muted rounded-lg overflow-hidden relative" data-testid="container-image">
                {!generatedImage && !isGenerating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-40" data-testid="icon-empty-state" />
                    <p className="text-sm font-medium" data-testid="text-empty-state">
                      Your generated image will appear here
                    </p>
                    <p className="text-xs mt-2 opacity-70" data-testid="text-empty-description">
                      Fill in the form and click Generate
                    </p>
                  </div>
                )}

                {isGenerating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted" data-testid="container-loading">
                    <div className="space-y-4 w-full p-8">
                      <Skeleton className="h-4 w-3/4 mx-auto" data-testid="skeleton-loading-1" />
                      <Skeleton className="h-4 w-1/2 mx-auto" data-testid="skeleton-loading-2" />
                      <div className="flex justify-center mt-8">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" data-testid="icon-loading" />
                      </div>
                      <p className="text-sm font-medium text-foreground text-center" data-testid="text-generating">
                        Creating your image...
                      </p>
                      <p className="text-xs text-muted-foreground text-center" data-testid="text-loading-description">
                        This may take a few moments
                      </p>
                    </div>
                  </div>
                )}

                {generatedImage && !isGenerating && (
                  <ImageWithFallback
                    src={generatedImage}
                    alt="Generated artwork"
                    className="w-full h-full object-cover transition-opacity duration-300"
                    loading="lazy"
                    data-testid="img-result"
                    fallbackText="Failed to load generated image"
                  />
                )}
                </div>
              </div>
            </Card>

            {error && (
              <Card className="p-4 bg-destructive/10 border-destructive/20" data-testid="card-error">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" data-testid="icon-error" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive" data-testid="text-error-title">
                      Generation failed
                    </p>
                    <p className="text-sm text-destructive/80 mt-1" data-testid="text-error-message">
                      {error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {generatedImage && !error && (
              <Card className="p-4 bg-primary/10 border-primary/20" data-testid="card-success">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" data-testid="icon-success" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary" data-testid="text-success-title">
                      Image generated successfully!
                    </p>
                    <p className="text-sm text-primary/80 mt-1" data-testid="text-success-message">
                      Your image is ready. Generate another or try a different style.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

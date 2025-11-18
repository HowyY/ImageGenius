import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Loader2, Sparkles, Image as ImageIcon, AlertCircle, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { generateRequestSchema } from "@shared/schema";
import type { StylePreset, GenerateRequest, GenerateResponse } from "@shared/schema";

export default function Home() {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedStyleDescription, setSelectedStyleDescription] = useState("");

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

  const generateMutation = useMutation({
    mutationFn: async (data: GenerateRequest) => {
      const response = await apiRequest("POST", "/api/generate", data);
      const result = await response.json() as GenerateResponse;
      return result;
    },
    onSuccess: (data) => {
      setGeneratedImage(data.imageUrl);
    },
  });

  const handleStyleChange = (value: string, onChange: (value: string) => void) => {
    onChange(value);
    const style = styles?.find((s) => s.id === value);
    setSelectedStyleDescription(style?.description || "");
  };

  const onSubmit = (data: GenerateRequest) => {
    generateMutation.mutate(data);
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-title">
            AI Image Generator
          </h1>
          <p className="text-muted-foreground" data-testid="text-subtitle">
            Transform your ideas into stunning visuals with AI-powered image generation
          </p>
        </div>

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
                      <FormLabel data-testid="label-style">Style Preset</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => handleStyleChange(value, field.onChange)}
                        disabled={stylesLoading || isGenerating}
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
                            variant={field.value === "seeddream" ? "default" : "outline"}
                            onClick={() => field.onChange("seeddream")}
                            disabled={isGenerating}
                            className="flex-1"
                            data-testid="button-engine-seeddream"
                          >
                            Seeddream
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-engine" />
                    </FormItem>
                  )}
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
                  <div className="flex justify-end">
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      size="sm"
                      data-testid="button-download"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Image
                    </Button>
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
                  <img
                    src={generatedImage}
                    alt="Generated artwork"
                    className="w-full h-full object-cover transition-opacity duration-300"
                    data-testid="img-result"
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

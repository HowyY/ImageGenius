import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Image as ImageIcon, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StylePreset, GenerateRequest, GenerateResponse } from "@shared/schema";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [styleId, setStyleId] = useState("");
  const [engine, setEngine] = useState<"nanobanana" | "seeddream">("nanobanana");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedStyleDescription, setSelectedStyleDescription] = useState("");

  const { data: styles, isLoading: stylesLoading } = useQuery<StylePreset[]>({
    queryKey: ["/api/styles"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: GenerateRequest) => {
      const response = await apiRequest<GenerateResponse>("POST", "/api/generate", data);
      return response;
    },
    onSuccess: (data) => {
      setGeneratedImage(data.imageUrl);
    },
  });

  const handleStyleChange = (value: string) => {
    setStyleId(value);
    const style = styles?.find((s) => s.id === value);
    setSelectedStyleDescription(style?.description || "");
  };

  const handleGenerate = () => {
    if (!prompt.trim() || !styleId) {
      return;
    }

    generateMutation.mutate({
      prompt: prompt.trim(),
      styleId,
      engine,
    });
  };

  const isGenerating = generateMutation.isPending;
  const error = generateMutation.error;

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
          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-sm font-medium">
                Describe your image
              </Label>
              <Textarea
                id="prompt"
                data-testid="input-prompt"
                placeholder="A serene mountain landscape at sunset, with snow-capped peaks reflecting golden light..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-32 resize-none text-base"
                disabled={isGenerating}
              />
              <p className="text-sm text-muted-foreground">
                {prompt.length} characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style" className="text-sm font-medium">
                Style Preset
              </Label>
              <Select
                value={styleId}
                onValueChange={handleStyleChange}
                disabled={stylesLoading || isGenerating}
              >
                <SelectTrigger id="style" data-testid="select-style" className="w-full">
                  <SelectValue placeholder={stylesLoading ? "Loading styles..." : "Select a style"} />
                </SelectTrigger>
                <SelectContent>
                  {styles?.map((style) => (
                    <SelectItem key={style.id} value={style.id} data-testid={`option-style-${style.id}`}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStyleDescription && (
                <p className="text-sm text-muted-foreground" data-testid="text-style-description">
                  {selectedStyleDescription}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Engine</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={engine === "nanobanana" ? "default" : "outline"}
                  onClick={() => setEngine("nanobanana")}
                  disabled={isGenerating}
                  className="flex-1"
                  data-testid="button-engine-nanobanana"
                >
                  Nanobanana
                </Button>
                <Button
                  type="button"
                  variant={engine === "seeddream" ? "default" : "outline"}
                  onClick={() => setEngine("seeddream")}
                  disabled={isGenerating}
                  className="flex-1"
                  data-testid="button-engine-seeddream"
                >
                  Seeddream
                </Button>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !styleId || isGenerating}
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
          </Card>

          <div className="space-y-4">
            <Card className="p-6">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                {!generatedImage && !isGenerating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-40" />
                    <p className="text-sm font-medium" data-testid="text-empty-state">
                      Your generated image will appear here
                    </p>
                    <p className="text-xs mt-2 opacity-70">
                      Fill in the form and click Generate
                    </p>
                  </div>
                )}

                {isGenerating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted animate-pulse">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                    <p className="text-sm font-medium text-foreground" data-testid="text-generating">
                      Creating your image...
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      This may take a few moments
                    </p>
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
            </Card>

            {error && (
              <Card className="p-4 bg-destructive/10 border-destructive/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive" data-testid="text-error">
                      Generation failed
                    </p>
                    <p className="text-sm text-destructive/80 mt-1">
                      {error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {generatedImage && !error && (
              <Card className="p-4 bg-primary/10 border-primary/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary" data-testid="text-success">
                      Image generated successfully!
                    </p>
                    <p className="text-sm text-primary/80 mt-1">
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

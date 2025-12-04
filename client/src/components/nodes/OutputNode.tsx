import { memo, useState } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import type { SelectStyle } from "@shared/schema";

interface OutputNodeData {
  generatedImage?: string;
  onChange?: (data: Record<string, unknown>) => void;
}

function OutputNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as OutputNodeData;
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const { getNodes } = useReactFlow();

  const { data: styles } = useQuery<SelectStyle[]>({
    queryKey: ["/api/styles"],
  });

  const collectDataFromNodes = () => {
    const nodes = getNodes();
    const characterNode = nodes.find((n) => n.type === "character");
    const styleNode = nodes.find((n) => n.type === "style");
    const angleNode = nodes.find((n) => n.type === "angle");
    const poseNode = nodes.find((n) => n.type === "pose");

    return {
      name: (characterNode?.data?.name as string) || "",
      visualPrompt: (characterNode?.data?.visualPrompt as string) || "",
      styleId: (styleNode?.data?.styleId as string) || "",
      angle: (angleNode?.data?.angle as string) || "front",
      pose: (poseNode?.data?.pose as string) || "standing",
    };
  };

  const handleGenerate = async () => {
    const collectedData = collectDataFromNodes();

    if (!collectedData.name || !collectedData.visualPrompt) {
      toast({
        title: "Missing Character Info",
        description: "Please fill in character name and visual prompt.",
        variant: "destructive",
      });
      return;
    }

    if (!collectedData.styleId) {
      toast({
        title: "Missing Style",
        description: "Please select a style for generation.",
        variant: "destructive",
      });
      return;
    }

    const selectedStyle = styles?.find((s) => s.id === collectedData.styleId);
    if (!selectedStyle) {
      toast({
        title: "Style Not Found",
        description: "Selected style is not available.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await apiRequest("/api/generate", "POST", {
        prompt: collectedData.visualPrompt,
        styleId: collectedData.styleId,
        styleLabel: selectedStyle.label,
        engine: selectedStyle.engines?.[0] || "nano-banana",
        angle: collectedData.angle,
        pose: collectedData.pose,
        expression: "neutral",
        cleanBackground: true,
        isCharacterCard: true,
      }) as { imageUrl?: string };

      if (response.imageUrl) {
        setGeneratedImage(response.imageUrl as string);
        toast({
          title: "Generation Complete",
          description: "Character card generated successfully!",
        });
      }
    } catch (error) {
      console.error("Generation failed:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const collectedData = collectDataFromNodes();
  const selectedStyle = styles?.find((s) => s.id === collectedData.styleId);

  const previewPrompt = collectedData.visualPrompt
    ? `${collectedData.name}: ${collectedData.visualPrompt.slice(0, 100)}${collectedData.visualPrompt.length > 100 ? "..." : ""}`
    : "Connect nodes to build prompt...";

  return (
    <Card className="w-[300px] shadow-lg border-2 border-amber-500/50 bg-card" data-testid={`node-output-${id}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-amber-500 border-2 border-background"
      />
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/10">
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          Output
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Preview</div>
          <ScrollArea className="h-[80px] bg-muted/50 rounded-md p-2">
            <div className="text-xs space-y-1">
              {collectedData.name && (
                <div><span className="text-blue-500">Character:</span> {collectedData.name}</div>
              )}
              {selectedStyle && (
                <div><span className="text-purple-500">Style:</span> {selectedStyle.label}</div>
              )}
              {collectedData.angle && (
                <div><span className="text-green-500">Angle:</span> {collectedData.angle}</div>
              )}
              {collectedData.pose && (
                <div><span className="text-orange-500">Pose:</span> {collectedData.pose}</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {generatedImage ? (
          <div className="relative aspect-square rounded-md overflow-hidden bg-muted">
            <img
              src={generatedImage}
              alt="Generated"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square rounded-md bg-muted/50 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !collectedData.styleId}
          className="w-full"
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
              Generate
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export const OutputNode = memo(OutputNodeComponent);

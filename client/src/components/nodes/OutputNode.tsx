import { memo, useState, useMemo } from "react";
import { Handle, Position, NodeProps, useReactFlow, useEdges } from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { SelectStyle } from "@shared/schema";

interface OutputNodeData {
  generatedImage?: string;
  onChange?: (data: Record<string, unknown>) => void;
}

interface ConnectedNodeData {
  type: string;
  name?: string;
  visualPrompt?: string;
  styleId?: string;
  generatedImage?: string;
  angle?: string;
  pose?: string;
}

function OutputNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as OutputNodeData;
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const { getNodes } = useReactFlow();
  const edges = useEdges();

  const { data: styles = [] } = useQuery<SelectStyle[]>({
    queryKey: ["/api/styles"],
  });

  const connectedNodesData = useMemo(() => {
    const nodes = getNodes();
    const connectedEdges = edges.filter((e) => e.target === id);
    const connectedNodeIds = connectedEdges.map((e) => e.source);
    
    const result: ConnectedNodeData[] = [];
    
    for (const nodeId of connectedNodeIds) {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        result.push({
          type: node.type || "",
          name: node.data?.name as string | undefined,
          visualPrompt: node.data?.visualPrompt as string | undefined,
          styleId: node.data?.styleId as string | undefined,
          generatedImage: node.data?.generatedImage as string | undefined,
          angle: node.data?.angle as string | undefined,
          pose: node.data?.pose as string | undefined,
        });
      }
    }
    
    return result;
  }, [edges, id, getNodes]);

  const characterData = connectedNodesData.find((n) => n.type === "character");
  const backgroundData = connectedNodesData.find((n) => n.type === "background");
  const propData = connectedNodesData.filter((n) => n.type === "prop");
  const styleData = connectedNodesData.find((n) => n.type === "style");
  const angleData = connectedNodesData.find((n) => n.type === "angle");
  const poseData = connectedNodesData.find((n) => n.type === "pose");

  const effectiveStyleId = characterData?.styleId || backgroundData?.styleId || styleData?.styleId || propData[0]?.styleId;
  const selectedStyle = styles.find((s) => s.id === effectiveStyleId);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const promptParts: string[] = [];
      const referenceImages: string[] = [];

      if (characterData?.visualPrompt) {
        const pose = poseData?.pose || "standing";
        const angle = angleData?.angle || "front";
        promptParts.push(`${characterData.name || "Character"} (${pose}, ${angle} view): ${characterData.visualPrompt}`);
        if (characterData.generatedImage) {
          referenceImages.push(characterData.generatedImage);
        }
      }

      if (backgroundData?.visualPrompt) {
        promptParts.push(`Background: ${backgroundData.visualPrompt}`);
        if (backgroundData.generatedImage) {
          referenceImages.push(backgroundData.generatedImage);
        }
      }

      for (const prop of propData) {
        if (prop.visualPrompt) {
          promptParts.push(`Prop: ${prop.visualPrompt}`);
          if (prop.generatedImage) {
            referenceImages.push(prop.generatedImage);
          }
        }
      }

      if (promptParts.length === 0) {
        throw new Error("No content to generate. Please connect nodes with visual prompts.");
      }

      if (!effectiveStyleId) {
        throw new Error("No style selected. Please select a style in one of the connected nodes.");
      }

      const finalPrompt = promptParts.join(". ");
      const engine = selectedStyle?.engines?.[0] || "nano-banana";

      const response = await apiRequest("POST", "/api/generate", {
        prompt: finalPrompt,
        styleId: effectiveStyleId,
        engine,
        userReferenceImages: referenceImages.slice(0, 3),
      });
      
      return response.json();
    },
    onSuccess: (result) => {
      if (result.imageUrl) {
        setGeneratedImage(result.imageUrl);
        nodeData.onChange?.({ generatedImage: result.imageUrl });
        toast({
          title: "Scene Generated",
          description: "Your scene has been generated successfully!",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate scene",
        variant: "destructive",
      });
    },
  });

  const canGenerate = (characterData?.visualPrompt || backgroundData?.visualPrompt || propData.some(p => p.visualPrompt)) && effectiveStyleId;

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
          <ScrollArea className="h-[100px] bg-muted/50 rounded-md p-2">
            <div className="text-xs space-y-1">
              {characterData?.name && (
                <div className="flex items-center gap-1">
                  <span className="text-blue-500">Character:</span> 
                  <span className="truncate">{characterData.name}</span>
                  {characterData.generatedImage && <span className="text-green-500 text-[10px]">(has image)</span>}
                </div>
              )}
              {backgroundData?.name && (
                <div className="flex items-center gap-1">
                  <span className="text-emerald-500">Background:</span> 
                  <span className="truncate">{backgroundData.name}</span>
                  {backgroundData.generatedImage && <span className="text-green-500 text-[10px]">(has image)</span>}
                </div>
              )}
              {propData.map((prop, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-amber-500">Prop:</span> 
                  <span className="truncate">{prop.name || "Unnamed"}</span>
                  {prop.generatedImage && <span className="text-green-500 text-[10px]">(has image)</span>}
                </div>
              ))}
              {selectedStyle && (
                <div><span className="text-purple-500">Style:</span> {selectedStyle.label}</div>
              )}
              {angleData?.angle && (
                <div><span className="text-cyan-500">Angle:</span> {angleData.angle}</div>
              )}
              {poseData?.pose && (
                <div><span className="text-orange-500">Pose:</span> {poseData.pose}</div>
              )}
              {!characterData && !backgroundData && propData.length === 0 && (
                <div className="text-muted-foreground italic">Connect nodes to build scene...</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {generatedImage ? (
          <div className="relative aspect-square rounded-md overflow-hidden bg-muted">
            <img
              src={generatedImage}
              alt="Generated Scene"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square rounded-md bg-muted/50 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
          </div>
        )}

        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || !canGenerate}
          className="w-full"
          data-testid="button-generate-scene"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Scene
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export const OutputNode = memo(OutputNodeComponent);

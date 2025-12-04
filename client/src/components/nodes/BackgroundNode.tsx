import { memo, useCallback, type ChangeEvent } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Image } from "lucide-react";

interface BackgroundNodeData {
  name?: string;
  visualPrompt?: string;
  onChange?: (data: Record<string, unknown>) => void;
}

function BackgroundNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as unknown as BackgroundNodeData;

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      nodeData.onChange?.({ name: e.target.value });
    },
    [nodeData]
  );

  const handlePromptChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      nodeData.onChange?.({ visualPrompt: e.target.value });
    },
    [nodeData]
  );

  return (
    <Card className="w-[280px] shadow-lg border-2 border-emerald-500/50 bg-card" data-testid={`node-background-${id}`}>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Image className="w-4 h-4 text-emerald-500" />
          Background
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input
            value={nodeData.name || ""}
            onChange={handleNameChange}
            placeholder="Background name..."
            className="h-8 text-sm"
            data-testid={`input-background-name-${id}`}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Visual Prompt</Label>
          <Textarea
            value={nodeData.visualPrompt || ""}
            onChange={handlePromptChange}
            placeholder="Describe background..."
            className="min-h-[60px] text-sm resize-none"
            data-testid={`textarea-background-prompt-${id}`}
          />
        </div>
      </CardContent>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-emerald-500"
      />
    </Card>
  );
}

export const BackgroundNode = memo(BackgroundNodeComponent);

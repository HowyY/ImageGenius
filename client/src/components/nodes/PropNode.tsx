import { memo, useCallback, type ChangeEvent } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";

interface PropNodeData {
  name?: string;
  visualPrompt?: string;
  onChange?: (data: Record<string, unknown>) => void;
}

function PropNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as unknown as PropNodeData;

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
    <Card className="w-[280px] shadow-lg border-2 border-amber-500/50 bg-card" data-testid={`node-prop-${id}`}>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-500" />
          Prop / Element
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input
            value={nodeData.name || ""}
            onChange={handleNameChange}
            placeholder="Prop name..."
            className="h-8 text-sm"
            data-testid={`input-prop-name-${id}`}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Visual Prompt</Label>
          <Textarea
            value={nodeData.visualPrompt || ""}
            onChange={handlePromptChange}
            placeholder="Describe prop..."
            className="min-h-[60px] text-sm resize-none"
            data-testid={`textarea-prop-prompt-${id}`}
          />
        </div>
      </CardContent>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-amber-500"
      />
    </Card>
  );
}

export const PropNode = memo(PropNodeComponent);

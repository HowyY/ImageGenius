import { memo, useCallback, type ChangeEvent } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";

interface CharacterNodeData {
  name: string;
  visualPrompt: string;
  onChange?: (data: { name?: string; visualPrompt?: string }) => void;
}

function CharacterNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as unknown as CharacterNodeData;

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
    <Card className="w-[280px] shadow-lg border-2 border-blue-500/50 bg-card" data-testid={`node-character-${id}`}>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-500/10">
            <User className="w-4 h-4 text-blue-500" />
          </div>
          Character
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input
            value={nodeData.name || ""}
            onChange={handleNameChange}
            placeholder="Character name..."
            className="h-8 text-sm"
            data-testid="input-character-name"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Visual Prompt</Label>
          <Textarea
            value={nodeData.visualPrompt || ""}
            onChange={handlePromptChange}
            placeholder="Describe appearance..."
            className="min-h-[80px] text-sm resize-none"
            data-testid="input-character-prompt"
          />
        </div>
      </CardContent>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-background"
      />
    </Card>
  );
}

export const CharacterNode = memo(CharacterNodeComponent);

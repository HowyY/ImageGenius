import { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Palette, Loader2 } from "lucide-react";
import type { SelectStyle } from "@shared/schema";

interface StyleNodeData {
  styleId: string;
  onChange?: (data: { styleId: string }) => void;
}

function StyleNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as unknown as StyleNodeData;

  const { data: styles, isLoading } = useQuery<SelectStyle[]>({
    queryKey: ["/api/styles"],
  });

  const handleStyleChange = useCallback(
    (value: string) => {
      nodeData.onChange?.({ styleId: value });
    },
    [nodeData]
  );

  const selectedStyle = styles?.find((s) => s.id === nodeData.styleId);

  return (
    <Card className="w-[220px] shadow-lg border-2 border-purple-500/50 bg-card" data-testid={`node-style-${id}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500 border-2 border-background"
      />
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-purple-500/10">
            <Palette className="w-4 h-4 text-purple-500" />
          </div>
          Style
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Select Style</Label>
          {isLoading ? (
            <div className="flex items-center justify-center h-8">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select value={nodeData.styleId || ""} onValueChange={handleStyleChange}>
              <SelectTrigger className="h-8 text-sm" data-testid="select-style">
                <SelectValue placeholder="Choose style..." />
              </SelectTrigger>
              <SelectContent>
                {styles?.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {selectedStyle && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
            {selectedStyle.description}
          </div>
        )}
      </CardContent>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500 border-2 border-background"
      />
    </Card>
  );
}

export const StyleNode = memo(StyleNodeComponent);

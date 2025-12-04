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
import { RotateCcw } from "lucide-react";

const ANGLE_OPTIONS = [
  { value: "front", label: "Front View" },
  { value: "three-quarter", label: "Three-Quarter Right" },
  { value: "side", label: "Side Profile (Right)" },
  { value: "back", label: "Back View" },
];

interface AngleNodeData {
  angle: string;
  onChange?: (data: { angle: string }) => void;
}

function AngleNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as unknown as AngleNodeData;

  const handleAngleChange = useCallback(
    (value: string) => {
      nodeData.onChange?.({ angle: value });
    },
    [nodeData]
  );

  return (
    <Card className="w-[200px] shadow-lg border-2 border-green-500/50 bg-card" data-testid={`node-angle-${id}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-500 border-2 border-background"
      />
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-green-500/10">
            <RotateCcw className="w-4 h-4 text-green-500" />
          </div>
          Angle
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">View Angle</Label>
          <Select value={nodeData.angle || "front"} onValueChange={handleAngleChange}>
            <SelectTrigger className="h-8 text-sm" data-testid="select-angle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANGLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500 border-2 border-background"
      />
    </Card>
  );
}

export const AngleNode = memo(AngleNodeComponent);

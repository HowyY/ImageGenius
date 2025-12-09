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
import { PersonStanding } from "lucide-react";

const POSE_OPTIONS = [
  { value: "standing", label: "Standing" },
  { value: "sitting", label: "Sitting" },
  { value: "walking", label: "Walking" },
  { value: "action", label: "Action Pose" },
  { value: "portrait", label: "Portrait (Upper Body)" },
];

interface PoseNodeData {
  pose: string;
  onChange?: (data: { pose: string }) => void;
}

function PoseNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as unknown as PoseNodeData;

  const handlePoseChange = useCallback(
    (value: string) => {
      nodeData.onChange?.({ pose: value });
    },
    [nodeData]
  );

  return (
    <Card className="w-[200px] shadow-lg border-2 border-orange-500/50 bg-card" data-testid={`node-pose-${id}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-orange-500 border-2 border-background"
      />
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-orange-500/10">
            <PersonStanding className="w-4 h-4 text-orange-500" />
          </div>
          Pose
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Character Pose</Label>
          <Select value={nodeData.pose || "standing"} onValueChange={handlePoseChange}>
            <SelectTrigger className="h-8 text-sm" data-testid="select-pose">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSE_OPTIONS.map((option) => (
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
        className="w-3 h-3 bg-orange-500 border-2 border-background"
      />
    </Card>
  );
}

export const PoseNode = memo(PoseNodeComponent);
